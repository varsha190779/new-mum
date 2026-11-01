# Optimum Network Observatory

An interactive, light-mode visual explainer of how **mump2p + Random Linear Network Coding (RLNC)** moves data
through a peer-to-peer network, compared with traditional whole-block forwarding.

**All numbers are simulated.** They come from a small seeded local model, not real-time Optimum telemetry, and make
no claim about real-network performance.

## Stack
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · SVG. No runtime dependencies beyond Next/React.
Inter (variable) is self-hosted from `public/fonts` (SIL OFL licence included).

## Run
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
npm run test:sim # prints headless simulation results for every size/condition/mode
```

## Layout
- `src/lib/sim/` – seeded simulation engine (`engine.ts`), layered topology (`graph.ts`), PRNG.
- `src/components/lab/` – Network Propagation Lab (SVG canvas, controls, metrics, coverage chart).
- `src/components/Stages.tsx` – four-stage explanation + rank demo.
- `src/components/Comparison.tsx` – side-by-side schematic, simulated results, chart.

## Simulation model (illustrative)
One engine drives both modes; every chart, metric and "What happened?" sentence is derived from its event history.
Both modes share the same topology, 8-piece block, packet size (1/8 block), link latencies, per-link loss/jitter draws
and seed. Each peer has one uplink shared by all its outgoing links, so redundant copies delay useful ones.

- **Traditional P2P:** the source sends each original piece once; peers flood each *new* piece to their neighbours. A
  peer reconstructs only when it holds every distinct piece. Repeats are duplicates; a lost piece is retried once.
- **mump2p + RLNC:** the source sends K coded packets; peers recode and forward once they hold a packet, and a peer
  reconstructs after K *independent* packets. A packet is likely, not certain, to be independent (dependent ones are
  counted as redundant). Decoded peers signal neighbours to stop sending (IDONTWANT-style) and keep minting fresh packets
  for neighbours that still need them.
- Stable vs congested changes latency, serialisation time, jitter and loss.

The fan-out, forward threshold and source emission were chosen as plausible values so the default 24-peer stable
scenario points the same way as the report; they are **not calibrated or fitted**. mump2p does not win every scenario
(run `npm run test:sim`). `k = 8` and all thresholds are illustrative, not protocol defaults. See the
[mump2p docs](https://docs.getoptimum.xyz/docs/learn/overview/p2p) and [arXiv:2508.04833](https://arxiv.org/abs/2508.04833).

## Reference report
`src/lib/report.ts` holds the supplied mump2p performance report (mainnet, Oct 25 – Oct 31, 2026) verbatim. It is
historical reference data, shown separately from simulation output. `TOTAL_STAKED` is `null` (shown as "Data
unavailable") because no verified source exists in this project; set it only from a verified source.
