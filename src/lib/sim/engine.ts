import { buildTopology, type Topology } from "./graph";
import { mulberry32 } from "./rng";

/**
 * Illustrative propagation model. It is NOT Optimum telemetry and does not
 * reproduce any measured data; it exists to show the *shape* of two approaches
 * under identical conditions (same topology, payload, latencies, loss/jitter
 * draws per link and seed):
 *
 *  - traditional: the block is K original pieces. Peers flood each piece they
 *    have not seen to their neighbours. A peer reconstructs only once it holds
 *    every distinct piece, so a late or lost piece holds it up, and the same
 *    piece can arrive several times (duplicates).
 *  - mump2p + RLNC: the same K pieces are mixed into coded packets of the same
 *    size. Peers recode what they hold, forward once they have a few packets,
 *    and a peer reconstructs after K *independent* packets, whichever they are.
 *    A packet is likely, not certain, to be independent. Decoded peers tell
 *    neighbours to stop sending (IDONTWANT-style).
 *
 * All metrics are derived from this one event history.
 */
export type Mode = "traditional" | "mump2p";
export type Condition = "stable" | "congested";

export interface SimConfig {
  size: number;
  condition: Condition;
  mode: Mode;
}

export const K = 8; // pieces per block (illustrative)
const SOURCE_COPIES = 1; // source emits K packets in both modes (traditional: each original piece once)
const EDGE_CAP = K + 3; // max coded packets per directed edge
const FANOUT = 3; // coded forwards per innovative packet
const FORWARD_AFTER = 1; // peers start recoding/forwarding once they hold this many independent packets
const P_INNOVATIVE = 0.94; // sender has information the receiver lacks
const P_INNOVATIVE_EQUAL = 0.3; // sender knows no more than the receiver
const PIECE_SIZE = 1 / K; // both modes: same packet size, in block-equivalents
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
  kind: "piece" | "coded";
  piece: number; // original piece index (traditional) or -1
  size: number;
  start: number;
  arrive: number;
  lost: boolean;
  retry: boolean;
  senderRank: number;
  tint: number;
  tint2: number;
}
export interface NodeState {
  /** distinct pieces held (traditional) or independent packets held (mump2p) */
  rank: number;
  have: boolean[]; // traditional: which original pieces are held
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

function hash(...n: number[]): number {
  let h = 2166136261;
  for (const v of n) {
    h ^= v + 0x9e3779b9;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function percentile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  const v = sorted[idx];
  return Number.isFinite(v) ? v : null;
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
  private pending: { at: number; from: number; to: number; piece: number }[] = [];
  private rng: () => number;
  private seed: number;
  private uplinkFree = new Map<number, number>();
  private edgeSent = new Map<number, number>();
  private edgeCount = new Map<number, number>();
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
    this.seed = 9100 + cfg.size * 31 + (cfg.condition === "stable" ? 1 : 2);
    this.rng = mulberry32(this.seed ^ (cfg.mode === "mump2p" ? 0x5bd1e995 : 0x1b873593));
    this.nodes = this.topo.nodes.map(() => ({
      rank: 0,
      have: Array(K).fill(false),
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
    src.have.fill(true);
    src.rank = K;
    src.doneAt = 0;
    const nbs = this.topo.nodes[0].neighbors;
    if (cfg.mode === "traditional") {
      // each original piece goes to SOURCE_COPIES different neighbours
      for (let j = 0; j < K; j++)
        for (let t = 0; t < Math.min(SOURCE_COPIES, nbs.length); t++) this.send(0, nbs[(j + t) % nbs.length], "piece", j, K);
    } else {
      // K * SOURCE_COPIES coded packets, round-robin across neighbours
      for (let i = 0; i < K * SOURCE_COPIES; i++) this.send(0, nbs[i % nbs.length], "coded", -1, K);
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

  /** Sorted reconstruction times of all peers; peers not yet reconstructed count as Infinity. */
  private sortedDone(): number[] {
    const v: number[] = [];
    for (let i = 1; i < this.nodes.length; i++) v.push(this.nodes[i].doneAt ?? Infinity);
    return v.sort((a, b) => a - b);
  }

  get medianDone(): number | null {
    const v = this.sortedDone().filter(Number.isFinite);
    if (!v.length) return null;
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }
  get firstDone(): number | null {
    const v = this.sortedDone();
    return Number.isFinite(v[0]) ? v[0] : null;
  }
  /** Time by which 95% of peers had reconstructed (null until that happens). */
  get p95Done(): number | null {
    return percentile(this.sortedDone(), 0.95);
  }
  get lastDone(): number | null {
    const v = this.sortedDone();
    const l = v[v.length - 1];
    return Number.isFinite(l) ? l : null;
  }

  private send(from: number, to: number, kind: "piece" | "coded", piece: number, senderRank: number, retry = false) {
    const p = PARAMS[this.cfg.condition];
    const key = from * 1000 + to;
    const n = this.edgeCount.get(key) ?? 0;
    this.edgeCount.set(key, n + 1);
    // network conditions depend only on (link, nth packet on that link) so both modes face the same draws
    const jr = mulberry32(hash(this.seed, from, to, n, 1))();
    const lr = mulberry32(hash(this.seed, from, to, n, 2))();
    // each peer has one uplink shared by all of its outgoing links, so every extra copy delays the rest
    const begin = Math.max(this.uplinkFree.get(from) ?? 0, this.clock);
    const tx = PIECE_SIZE * p.serial;
    const jit = 1 + (jr - 0.5) * p.jitter;
    const arrive = begin + tx + (this.latency.get(key) ?? 0.4) * p.lat * jit;
    this.uplinkFree.set(from, begin + tx);
    if (kind === "coded") this.edgeSent.set(key, (this.edgeSent.get(key) ?? 0) + 1);
    this.packets.push({
      id: this.nextId++,
      from,
      to,
      kind,
      piece,
      size: PIECE_SIZE,
      start: begin,
      arrive,
      lost: lr < p.loss,
      retry,
      senderRank,
      tint: Math.floor(this.rng() * 4),
      tint2: Math.floor(this.rng() * 4),
    });
    this.counters.sent++;
    this.counters.dataUnits += PIECE_SIZE;
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
    cand.slice(0, count).forEach((n) => this.send(node, n, "coded", -1, rank));
  }

  private arrival(p: Packet) {
    if (p.lost) {
      this.counters.lost++;
      if (p.kind === "piece" && !p.retry) this.pending.push({ at: p.arrive + 1.0, from: p.from, to: p.to, piece: p.piece });
      return;
    }
    const n = this.nodes[p.to];
    this.counters.delivered++;
    n.received++;
    if (n.firstAt === null) n.firstAt = p.arrive;

    if (p.kind === "piece") {
      if (n.have[p.piece]) return this.markRedundant(p, n);
      n.have[p.piece] = true;
      n.rank++;
      // flood the new piece onward, unchanged
      this.topo.nodes[p.to].neighbors
        .filter((nb) => nb !== p.from && nb !== 0)
        .forEach((nb) => this.send(p.to, nb, "piece", p.piece, n.rank));
      if (n.rank >= K) {
        n.doneAt = p.arrive;
        this.pulses.push({ node: p.to, t: this.time, kind: "done" });
      }
      return;
    }

    if (n.rank >= K) return this.markRedundant(p, n);
    const chance = p.senderRank > n.rank ? P_INNOVATIVE : P_INNOVATIVE_EQUAL;
    if (this.rng() >= chance) return this.markRedundant(p, n);
    n.rank++;
    if (n.rank >= K) {
      n.doneAt = p.arrive;
      this.pulses.push({ node: p.to, t: this.time, kind: "done" });
      this.announceDone(p.to);
      // a reconstructed peer can mint fresh independent packets for neighbours
      this.forwardCoded(p.to, p.from, FANOUT + 1);
    } else if (n.rank >= FORWARD_AFTER) {
      this.forwardCoded(p.to, p.from, FANOUT);
    }
  }

  /** Repair: reconstructed peers keep minting fresh coded packets for neighbours that still need them. */
  private topUp(): number {
    let sent = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].rank < K) continue;
      const cand = this.topo.nodes[i].neighbors.filter(
        (n) => n !== 0 && this.sentOn(i, n) < EDGE_CAP + 6 && !this.knownDone(i, n),
      );
      if (!cand.length) continue;
      this.send(i, cand[Math.floor(this.rng() * cand.length)], "coded", -1, K);
      sent++;
    }
    return sent;
  }

  /** IDONTWANT-style signal: neighbours stop sending to a decoded peer; unsent packets are withdrawn. */
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
      this.send(r.from, r.to, "piece", r.piece, K, true);
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
    const idle = this.packets.length === 0 && this.pending.length === 0;
    const stalled = idle && (this.cfg.mode === "traditional" || (topUps === 0 && this.time > 1));
    if (allDone || stalled || this.time > MAX_TIME) {
      this.finished = true;
      this.endTime = this.time;
      this.packets = [];
      this.history.push({ t: this.time, cov: this.doneCount / this.peerCount });
    }
  }

  summary(): RunSummary {
    const first = this.firstDone;
    const p95 = this.p95Done;
    return {
      history: this.history,
      complete: this.doneCount === this.peerCount,
      peers: this.peerCount,
      done: this.doneCount,
      firstDone: first,
      p95Done: p95,
      lastDone: this.lastDone,
      median: this.medianDone,
      spread: first !== null && p95 !== null ? p95 - first : null,
      packetsSent: this.counters.sent,
      redundantPackets: this.counters.redundant,
      redundantUnits: this.counters.redundantUnits,
      dataUnits: this.counters.dataUnits,
      lost: this.counters.lost,
      redundantShare: this.counters.delivered ? this.counters.redundant / this.counters.delivered : 0,
    };
  }
}

export interface RunSummary {
  history: { t: number; cov: number }[];
  complete: boolean;
  peers: number;
  done: number;
  firstDone: number | null;
  p95Done: number | null;
  lastDone: number | null;
  median: number | null;
  /** p95 reconstruction time minus first reconstruction time (sim s) */
  spread: number | null;
  packetsSent: number;
  redundantPackets: number;
  redundantUnits: number;
  dataUnits: number;
  lost: number;
  redundantShare: number;
}

const runCache = new Map<string, RunSummary>();

/** Headless full run for the same config; deterministic, so it matches the live lab exactly. */
export function runToCompletion(cfg: SimConfig): RunSummary {
  const key = `${cfg.mode}|${cfg.size}|${cfg.condition}`;
  const hit = runCache.get(key);
  if (hit) return hit;
  const sim = new Simulation(cfg);
  let guard = 0;
  while (!sim.finished && guard++ < 20000) sim.advance(STEP);
  const out = sim.summary();
  runCache.set(key, out);
  return out;
}
