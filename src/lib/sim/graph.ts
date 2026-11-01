/**
 * Structured, layered topology: a source on the left (or top on mobile) and
 * peers arranged in hop layers. Positions are normalised: u = along the
 * propagation axis (0..1), v = across it (0..1).
 */
export interface NodeDef {
  id: number;
  name: string;
  layer: number;
  u: number;
  v: number;
  neighbors: number[];
}
export interface EdgeDef {
  a: number;
  b: number;
}
export interface Topology {
  size: number;
  nodes: NodeDef[];
  edges: EdgeDef[];
  layers: number;
}

export const NETWORK_SIZES = [12, 24, 40] as const;
export type NetworkSize = (typeof NETWORK_SIZES)[number];

const LAYER_COUNTS: Record<number, number[]> = {
  12: [3, 4, 5],
  24: [4, 7, 8, 5],
  40: [4, 8, 12, 10, 6],
};

const cache = new Map<number, Topology>();

export function buildTopology(size: number): Topology {
  const hit = cache.get(size);
  if (hit) return hit;
  const counts = LAYER_COUNTS[size] ?? LAYER_COUNTS[24];
  const nodes: NodeDef[] = [{ id: 0, name: "Source", layer: 0, u: 0, v: 0.5, neighbors: [] }];
  const layerIds: number[][] = [[0]];
  let id = 1;
  counts.forEach((n, li) => {
    const layer = li + 1;
    const ids: number[] = [];
    for (let i = 0; i < n; i++) {
      nodes.push({
        id,
        name: `Peer ${String(id).padStart(2, "0")}`,
        layer,
        u: layer / counts.length,
        v: (i + 0.5) / n,
        neighbors: [],
      });
      ids.push(id++);
    }
    layerIds.push(ids);
  });

  const seen = new Set<string>();
  const edges: EdgeDef[] = [];
  const connect = (a: number, b: number) => {
    if (a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ a, b });
    nodes[a].neighbors.push(b);
    nodes[b].neighbors.push(a);
  };

  // source -> first layer
  layerIds[1].forEach((p) => connect(0, p));
  for (let l = 2; l < layerIds.length; l++) {
    const prev = layerIds[l - 1];
    const cur = layerIds[l];
    cur.forEach((nid, i) => {
      const p = Math.min(prev.length - 1, Math.floor(((i + 0.5) * prev.length) / cur.length));
      connect(nid, prev[p]);
      const alt = Math.min(prev.length - 1, Math.max(0, p + (i % 2 === 0 ? 1 : -1)));
      connect(nid, prev[alt]);
    });
  }
  // lateral links give gossip-style redundant paths inside each layer
  for (let l = 1; l < layerIds.length; l++) {
    const cur = layerIds[l];
    for (let i = 0; i + 1 < cur.length; i += 2) connect(cur[i], cur[i + 1]);
    for (let i = 1; i + 1 < cur.length; i += 4) connect(cur[i], cur[i + 1]);
  }

  const topo: Topology = { size, nodes, edges, layers: layerIds.length };
  cache.set(size, topo);
  return topo;
}
