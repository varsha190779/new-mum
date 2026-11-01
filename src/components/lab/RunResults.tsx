"use client";

import { runToCompletion, type Mode, type RunSummary } from "@/lib/sim/engine";
import { explainRun } from "@/lib/sim/insights";

interface Row {
  label: string;
  unit: string;
  trad: number | null;
  mump: number | null;
  max?: number;
  fmt: (v: number) => string;
  hint: string;
}

function Bar({ value, max, color, text }: { value: number | null; max: number; color: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper">
        {value !== null && (
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(2, Math.min(100, (value / (max || 1)) * 100))}%`, background: color }}
          />
        )}
      </div>
      <span className="num w-[84px] shrink-0 text-right text-[13px] font-medium">{text}</span>
    </div>
  );
}

export function RunResults({ mode, size, condition }: { mode: Mode; size: number; condition: "stable" | "congested" }) {
  const t: RunSummary = runToCompletion({ size, condition, mode: "traditional" });
  const m: RunSummary = runToCompletion({ size, condition, mode: "mump2p" });
  const insight = explainRun(mode, t, m);
  const rows: Row[] = [
    { label: "Time to reconstruction", unit: "sim s", trad: t.p95Done, mump: m.p95Done, fmt: (v) => `${v.toFixed(1)} s`, hint: "until 95% of peers have the block" },
    { label: "Peers reconstructed", unit: "peers", trad: t.done, mump: m.done, max: t.peers, fmt: (v) => `${v} / ${t.peers}`, hint: "by the end of the run" },
    { label: "Packets transmitted", unit: "packets", trad: t.packetsSent, mump: m.packetsSent, fmt: (v) => `${v}`, hint: "every packet is the same size (1/8 block)" },
    { label: "Data moved", unit: "blocks", trad: t.dataUnits, mump: m.dataUnits, fmt: (v) => `${v.toFixed(1)} blk`, hint: "total sent, in block-equivalents" },
    { label: "Redundant data", unit: "blocks", trad: t.redundantUnits, mump: m.redundantUnits, fmt: (v) => `${v.toFixed(1)} blk`, hint: "delivered but added nothing new" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <p className="eyebrow">What happened?</p>
        <p className="mt-2 text-[17px] font-semibold leading-snug tracking-tight">{insight.headline}</p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-2">
          {insight.points.map((p) => (
            <li key={p} className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
          Generated from this run. mump2p does not win every scenario: congestion, loss, coding overhead and topology all matter.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow">Compare the results</p>
          <div className="flex gap-4 text-xs text-ink-2">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ink" />Traditional</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" />mump2p</span>
          </div>
        </div>
        <div className="mt-3 divide-y divide-line">
          {rows.map((r) => {
            const max = r.max ?? Math.max(r.trad ?? 0, r.mump ?? 0, 0.0001);
            return (
              <div key={r.label} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className="text-[11px] text-ink-3">{r.hint}</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  <Bar value={r.trad} max={max} color="#0C100D" text={r.trad === null ? "not reached" : r.fmt(r.trad)} />
                  <Bar value={r.mump} max={max} color="#1E8A4C" text={r.mump === null ? "not reached" : r.fmt(r.mump)} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-ink-3">
          Both modes: same {size}-peer topology, 8-piece block, packet size, link latencies, loss draws and seed. Simulated units.
        </p>
      </div>
    </div>
  );
}
