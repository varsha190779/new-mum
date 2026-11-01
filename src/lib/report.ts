/**
 * Historical reference data, copied verbatim from the supplied mump2p performance report
 * (Optimum Hub, mainnet, Oct 25 – Oct 31, 2026). This is NOT simulation output and is
 * never combined with it; the lab only shows ratios next to it for context.
 */
export const REPORT = {
  title: "mump2p Performance Report",
  subtitle: "Mainnet · Oct 25 – Oct 31, 2026 · 7d · 50,136 slots",
  sourceUrl: "https://hub.getoptimum.xyz",
  headline: [
    { value: "1.5×", label: "Tighter propagation spread", sub: "vs gossipsub, mean per slot" },
    { value: "254 ms", label: "Earlier p95 arrival", sub: "254 ms mean lead ± 2.5 ms" },
    { value: "88.5%", label: "Slots accelerated", sub: "mump2p first vs Xatu reference" },
  ],
  spread: {
    title: "Propagation spread",
    sub: "p95 arrival – first arrival, per slot · mean of 50,129 slots",
    mump2p: { label: "262.2 ms", ms: 262.2 },
    gossipsub: { label: "386.5 ms", ms: 386.5 },
  },
  arrival: {
    title: "Slot arrival",
    sub: "p95 of arrivals from slot start, per slot · mean of 50,129 slots",
    mump2p: { label: "1,978.9 ms", ms: 1978.9 },
    gossipsub: { label: "2,232.6 ms", ms: 2232.6 },
  },
  advantage: {
    title: "Network advantage",
    tagline: "The lead grows where it matters — at the tail.",
    sub: "Mean per-slot lead of mump2p over gossipsub, by arrival percentile.",
    rows: [
      { pct: "p50", label: "85.0 ms", ms: 85.0 },
      { pct: "p75", label: "133.0 ms", ms: 133.0 },
      { pct: "p80", label: "134.0 ms", ms: 134.0 },
      { pct: "p95", label: "254.0 ms", ms: 254.0 },
    ],
    footnote: "50,129 slots each",
  },
  basis: [
    ["Sample", "356 gateways · 183 Xatu sentries"],
    ["Window", "50,129 slots · 7d"],
    ["Measured through", "Oct 31, 24:00 UTC"],
  ],
} as const;

/** No verified staking data source exists in this project, so this stays null (shown as "Data unavailable"). */
export const TOTAL_STAKED: string | null = null;
