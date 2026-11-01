import { buildTopology, type Topology } from "./graph";
import { mulberry32 } from "./rng";

/**
 * Toy propagation model. It is NOT Optimum telemetry and makes no claim about
 * real-world performance; it exists to show the *shape* of the two approaches:
 *
 *  - traditional: a whole block is received, then forwarded in full to peers.
 *  - mump2p + RLNC: the block is K pieces; peers exchange coded packets
 *    (random combinations) and forward recoded packets as soon as they gain
 *    new information, before the whole block is reconstructed.
 *
 * Rank model: a peer reconstructs when it holds K *independent* packets. A
 * packet is innovative with high (not certain) probability and only if the
 * sender knows something the receiver does not (sender rank > receiver rank,
 * with a small chance otherwise). Dependent packets are counted as redundant.
 */
export type Mode = "traditional" | "mump2p";
export type Condition = "stable" | "congested";

export interface SimConfig {
  size: number;
  condition: Condition;
  mode: Mode;
}

export const K = 8; // pieces per block
const EDGE_CAP = K + 3; // max coded packets per directed edge
const FANOUT = 2; // coded forwards per innovative packet
const FORWARD_AFTER = 2; // peers start recoding/forwarding once they hold this many independent packets
const P_INNOVATIVE = 0.94; // sender has info receiver lacks
const P_INNOVATIVE_EQUAL = 0.3; // sender rank <= receiver rank
const STEP = 1 / 60;
const MAX_TIME = 60;

const PARAMS = {
  stable: { serial: 0.8, lat: 1, jitter: 0.15, loss: 0.01 },
  congested: { serial: 1.5, lat: 1.7, jitter: 0.5, loss: 0.1 },
} as const;

export interface Packet {
  id: number;
  from: number;
  to: number;
  kind: "full" | "coded";
  size: number;
  start: number;
  arrive: number;
  lost: boolean;
  retry: boolean;
  senderRank: number;
  tint: number; // 0..3 for visual variety of coded packets
  tint2: number;
}
export interface NodeState {
  rank: number;
  hasBlock: boolean;
  doneAt: number | null;
  firstAt: number | null;
  received: number;
  redundant: number;
}
export interface Pulse {
  node: number;
  t: number;
  kind: "redundant" | "done";
}
export interface Counters {
  sent: number;
  delivered: number;
  redundant: number;
  lost: number;
  dataUnits: number;
  redundantUnits: number;
}

export class Simulation {
  readonly topo: Topology;
  readonly cfg: SimConfig;
  readonly peerCount: number;
  time = 0;
  packets: Packet[] = [];
  nodes: NodeState[];
  counters: Counters = { sent: 0, delivered: 0, redundant: 0, lost: 0, dataUnits: 0, redundantUnits: 0 };
  pulses: Pulse[] = [];
  history: { t: number; cov: number }[] = [{ t: 0, cov: 0 }];
  finished = false;
  endTime: number | null = null;

  private clock = 0;
  private pending: { at: number; from: number; to: number }[] = [];
  private rng: () => number;
  private edgeFree = new Map<number, number>();
  private edgeSent = new Map<number, number>();
  private latency = new Map<number, number>();
  private nextId = 1;
  private lastHist = 0;
  private residual = 0;
  private nextTopUp = 0.25;
  private doneKnownAt = new Map<number, number>();

  constructor(cfg: SimConfig) {
    this.cfg = cfg;
    this.topo = buildTopology(cfg.size);
    this.peerCount = this.topo.nodes.length - 1;
    this.rng = mulberry32(9100 + cfg.size * 31 + (cfg.condition === "stable" ? 1 : 2));
    this.nodes = this.topo.nodes.map(() => ({
      rank: 0,
      hasBlock: false,
      doneAt: null,
      firstAt: null,
      received: 0,
      redundant: 0,
    }));
    for (const e of this.topo.edges) {
      const a = this.topo.nodes[e.a];
      const b = this.topo.nodes[e.b];
      const d = Math.hypot((a.u - b.u) * 1.6, a.v - b.v);
      const lat = 0.2 + d * 0.5;
      this.latency.set(e.a * 1000 + e.b, lat);
      this.latency.set(e.b * 1000 + e.a, lat);
    }
    const src = this.nodes[0];
    src.hasBlock = true;
    src.rank = K;
    src.doneAt = 0;
    const neighbors = this.topo.nodes[0].neighbors;
    if (cfg.mode === "traditional") {
      neighbors.forEach((nb) => this.send(0, nb, "full", K));
    } else {
      for (let i = 0; i < EDGE_CAP; i++) neighbors.forEach((nb) => this.send(0, nb, "coded", K));
    }
  }

  get doneCount(): number {
    let n = 0;
    for (let i = 1; i < this.nodes.length; i++) if (this.nodes[i].doneAt !== null) n++;
    return n;
  }

  get anyPeerReceived(): boolean {
    for (let i = 1; i < this.nodes.length; i++) if (this.nodes[i].received > 0) return true;
    return false;
  }

  /** Median reconstruction time over peers that have reconstructed. */
  get medianDone(): number | null {
    const v: number[] = [];
    for (let i = 1; i < this.nodes.length; i++) {
      const d = this.nodes[i].doneAt;
      if (d !== null) v.push(d);
    }
    if (!v.length) return null;
    v.sort((a, b) => a - b);
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  private send(from: number, to: number, kind: "full" | "coded", senderRank: number, retry = false) {
    const p = PARAMS[this.cfg.condition];
    const size = kind === "full" ? 1 : 1 / K;
    const key = from * 1000 + to;
    const begin = Math.max(this.edgeFree.get(key) ?? 0, this.clock);
    const tx = size * p.serial;
    const jit = 1 + (this.rng() - 0.5) * p.jitter;
    const arrive = begin + tx + (this.latency.get(key) ?? 0.4) * p.lat * jit;
    this.edgeFree.set(key, begin + tx);
    if (kind === "coded") this.edgeSent.set(key, (this.edgeSent.get(key) ?? 0) + 1);
    this.packets.push({
      id: this.nextId++,
      from,
      to,
      kind,
      size,
      start: begin,
      arrive,
      lost: this.rng() < p.loss,
      retry,
      senderRank,
      tint: Math.floor(this.rng() * 4),
      tint2: Math.floor(this.rng() * 4),
    });
    this.counters.sent++;
    this.counters.dataUnits += size;
  }

  private sentOn(from: number, to: number) {
    return this.edgeSent.get(from * 1000 + to) ?? 0;
  }

  private forwardCoded(node: number, exclude: number, count: number) {
    const rank = this.nodes[node].rank;
    const cand = this.topo.nodes[node].neighbors.filter(
      (n) => n !== exclude && n !== 0 && this.sentOn(node, n) < EDGE_CAP && !this.knownDone(node, n),
    );
    for (let i = cand.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [cand[i], cand[j]] = [cand[j], cand[i]];
    }
    cand.slice(0, count).forEach((n) => this.send(node, n, "coded", rank));
  }

  private arrival(p: Packet) {
    if (p.lost) {
      this.counters.lost++;
      if (p.kind === "full" && !p.retry) this.pending.push({ at: p.arrive + 1.0, from: p.from, to: p.to });
      return;
    }
    const n = this.nodes[p.to];
    this.counters.delivered++;
    n.received++;
    if (n.firstAt === null) n.firstAt = p.arrive;

    if (p.kind === "full") {
      if (n.hasBlock) return this.markRedundant(p, n);
      n.hasBlock = true;
      n.rank = K;
      n.doneAt = p.arrive;
      this.pulses.push({ node: p.to, t: this.time, kind: "done" });
      this.topo.nodes[p.to].neighbors
        .filter((nb) => nb !== p.from)
        .forEach((nb) => this.send(p.to, nb, "full", K));
      return;
    }

    if (n.rank >= K) return this.markRedundant(p, n);
    const chance = p.senderRank > n.rank ? P_INNOVATIVE : P_INNOVATIVE_EQUAL;
    if (this.rng() >= chance) return this.markRedundant(p, n);
    n.rank++;
    if (n.rank >= K) {
      n.hasBlock = true;
      n.doneAt = p.arrive;
      this.pulses.push({ node: p.to, t: this.time, kind: "done" });
      this.announceDone(p.to);
      // a reconstructed peer can mint fresh independent packets for neighbours
      this.forwardCoded(p.to, p.from, FANOUT + 1);
    } else if (n.rank >= FORWARD_AFTER) {
      this.forwardCoded(p.to, p.from, FANOUT);
    }
  }

  /**
   * Repair step: peers that have reconstructed can mint fresh coded packets, so
   * a neighbour that lost some packets can still catch up. Bounded per edge.
   */
  private topUp(): number {
    let sent = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].rank < K) continue;
      const cand = this.topo.nodes[i].neighbors.filter(
        (n) => n !== 0 && this.sentOn(i, n) < EDGE_CAP + 6 && !this.knownDone(i, n),
      );
      if (!cand.length) continue;
      this.send(i, cand[Math.floor(this.rng() * cand.length)], "coded", K);
      sent++;
    }
    return sent;
  }

  /**
   * IDONTWANT-style signal: once a peer has decoded, its neighbours stop sending it
   * shards. Shards a neighbour has not started transmitting yet are withdrawn.
   */
  private announceDone(node: number) {
    for (const nb of this.topo.nodes[node].neighbors) {
      const lat = this.latency.get(nb * 1000 + node) ?? 0.4;
      this.doneKnownAt.set(nb * 1000 + node, this.clock + lat);
    }
    this.packets = this.packets.filter((q) => {
      if (q.to !== node || q.kind !== "coded") return true;
      const at = this.doneKnownAt.get(q.from * 1000 + node);
      if (at === undefined || q.start < at) return true;
      this.counters.sent--;
      this.counters.dataUnits -= q.size;
      return false;
    });
  }

  private knownDone(from: number, to: number) {
    const at = this.doneKnownAt.get(from * 1000 + to);
    return at !== undefined && at <= this.clock;
  }

  private markRedundant(p: Packet, n: NodeState) {
    n.redundant++;
    this.counters.redundant++;
    this.counters.redundantUnits += p.size;
    this.pulses.push({ node: p.to, t: this.time, kind: "redundant" });
  }

  /** Advance by a real-time delta (seconds of sim time); uses fixed internal steps. */
  advance(dt: number) {
    this.residual += dt;
    while (this.residual >= STEP && !this.finished) {
      this.residual -= STEP;
      this.tick(STEP);
    }
  }

  private tick(dt: number) {
    this.time += dt;
    this.pending.sort((a, b) => a.at - b.at);
    while (this.pending.length && this.pending[0].at <= this.time) {
      const r = this.pending.shift()!;
      this.clock = r.at;
      this.send(r.from, r.to, "full", K, true);
    }
    for (;;) {
      let idx = -1;
      let best = Infinity;
      for (let i = 0; i < this.packets.length; i++) {
        const a = this.packets[i].arrive;
        if (a <= this.time && a < best) {
          best = a;
          idx = i;
        }
      }
      if (idx < 0) break;
      const [p] = this.packets.splice(idx, 1);
      this.clock = p.arrive;
      this.arrival(p);
    }
    this.clock = this.time;
    let topUps = 0;
    if (this.cfg.mode === "mump2p" && this.time >= this.nextTopUp) {
      this.nextTopUp += 0.25;
      topUps = this.topUp();
    }
    this.pulses = this.pulses.filter((x) => this.time - x.t < 0.9);
    if (this.time - this.lastHist >= 0.1) {
      this.lastHist = this.time;
      this.history.push({ t: this.time, cov: this.doneCount / this.peerCount });
    }
    const allDone = this.doneCount === this.peerCount;
    const stalled =
      this.packets.length === 0 && this.pending.length === 0 && (this.cfg.mode === "traditional" || (topUps === 0 && this.time >= this.nextTopUp - 0.25 && this.time > 1));
    if (allDone || stalled || this.time > MAX_TIME) {
      this.finished = true;
      this.endTime = this.time;
      this.packets = [];
      this.history.push({ t: this.time, cov: this.doneCount / this.peerCount });
    }
  }
}

export interface RunSummary {
  history: { t: number; cov: number }[];
  complete: boolean;
  peers: number;
  done: number;
  lastDone: number | null;
  median: number | null;
  redundantUnits: number;
  dataUnits: number;
  lost: number;
  redundantShare: number;
}

const runCache = new Map<string, RunSummary>();

/** Headless full run for the same config; deterministic, so matches the live lab. */
export function runToCompletion(cfg: SimConfig): RunSummary {
  const key = `${cfg.mode}|${cfg.size}|${cfg.condition}`;
  const hit = runCache.get(key);
  if (hit) return hit;
  const sim = new Simulation(cfg);
  let guard = 0;
  while (!sim.finished && guard++ < 20000) sim.advance(STEP);
  let last: number | null = null;
  for (let i = 1; i < sim.nodes.length; i++) {
    const d = sim.nodes[i].doneAt;
    if (d !== null && (last === null || d > last)) last = d;
  }
  const out: RunSummary = {
    history: sim.history,
    complete: sim.doneCount === sim.peerCount,
    peers: sim.peerCount,
    done: sim.doneCount,
    lastDone: last,
    median: sim.medianDone,
    redundantUnits: sim.counters.redundantUnits,
    dataUnits: sim.counters.dataUnits,
    lost: sim.counters.lost,
    redundantShare: sim.counters.delivered ? sim.counters.redundant / sim.counters.delivered : 0,
  };
  runCache.set(key, out);
  return out;
}
