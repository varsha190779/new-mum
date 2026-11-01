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

## Simulation model (simplified)
- A block is `K = 8` pieces. Traditional mode forwards the whole block store-and-forward, with one retry on loss.
- mump2p mode forwards coded packets (1/K size) as soon as a peer gains new information. A packet is *likely*, not
  guaranteed, to be independent; dependent packets are counted as redundant, so a peer may need more than `K`.
- Stable vs congested changes link latency, serialisation time and loss probability.
