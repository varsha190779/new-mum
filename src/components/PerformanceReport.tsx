"use client";

import { REPORT, TOTAL_STAKED } from "@/lib/report";
import { runToCompletion } from "@/lib/sim/engine";
import { useObservatory } from "./ObservatoryContext";

function PairBar({ label, text, value, max, color }: { label: string; text: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="num font-semibold">{text}</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export function PerformanceReport() {
  const { size, condition } = useObservatory();
  const t = runToCompletion({ size, condition, mode: "traditional" });
  const m = runToCompletion({ size, condition, mode: "mump2p" });
  const reportRatio = REPORT.spread.gossipsub.ms / REPORT.spread.mump2p.ms;
  const simSpread = t.spread !== null && m.spread !== null && m.spread > 0 ? t.spread / m.spread : null;
  const simP95 = t.p95Done !== null && m.p95Done !== null && m.p95Done > 0 ? t.p95Done / m.p95Done : null;
  const reportP95 = REPORT.arrival.gossipsub.ms / REPORT.arrival.mump2p.ms;

  return (
    <section id="report" className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow">Reference data</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">{REPORT.title}</h2>
          <p className="num mt-3 text-sm text-ink-2">{REPORT.subtitle}</p>
        </div>
        <p className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs text-ink-2">
          Historical reference data · not simulation output
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {REPORT.headline.map((h) => (
          <div key={h.label} className="panel p-5">
            <div className="num text-[40px] font-semibold leading-none tracking-[-0.03em] text-accent-dark">{h.value}</div>
            <div className="mt-3 text-sm font-medium">{h.label}</div>
            <div className="mt-1 text-xs text-ink-3">{h.sub}</div>
          </div>
        ))}
        <div className="rounded-panel border border-dashed border-line-2 bg-transparent p-5">
          <div className="eyebrow">Total Staked</div>
          <div className={`mt-3 text-[22px] font-semibold leading-none tracking-tight ${TOTAL_STAKED ? "num" : "text-ink-4"}`}>
            {TOTAL_STAKED ?? "Data unavailable"}
          </div>
          <div className="mt-3 text-xs text-ink-3">{TOTAL_STAKED ? "" : "No verified data source is connected to this site."}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[REPORT.spread, REPORT.arrival].map((blk) => {
          const max = Math.max(blk.mump2p.ms, blk.gossipsub.ms);
          return (
            <article key={blk.title} className="panel p-5 sm:p-6">
              <h3 className="text-lg font-semibold tracking-tight">{blk.title}</h3>
              <p className="mt-1 text-xs text-ink-3">{blk.sub}</p>
              <div className="mt-5 space-y-4">
                <PairBar label="mump2p" text={blk.mump2p.label} value={blk.mump2p.ms} max={max} color="#1E8A4C" />
                <PairBar label="libp2p gossipsub" text={blk.gossipsub.label} value={blk.gossipsub.ms} max={max} color="#0C100D" />
              </div>
              <p className="mt-4 text-[11px] text-ink-3">Bars start at zero.</p>
            </article>
          );
        })}
      </div>

      <div className="panel mt-4 p-5 sm:p-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <p className="eyebrow">{REPORT.advantage.title}</p>
            <p className="mt-2 text-2xl font-semibold leading-snug tracking-[-0.02em]">{REPORT.advantage.tagline}</p>
            <p className="mt-2 text-sm text-ink-2">{REPORT.advantage.sub}</p>
            <dl className="mt-6 divide-y divide-line rounded-2xl border border-line text-sm">
              {REPORT.basis.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="num text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="space-y-4">
            {REPORT.advantage.rows.map((r) => (
              <div key={r.pct} className="grid grid-cols-[34px_1fr_72px] items-center gap-3">
                <span className="num text-sm font-medium text-ink-2">{r.pct}</span>
                <div className="h-3 overflow-hidden rounded-full bg-paper">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(r.ms / 254.0) * 100}%` }} />
                </div>
                <span className="num text-right text-sm font-semibold">{r.label}</span>
              </div>
            ))}
            <p className="text-[11px] text-ink-3">{REPORT.advantage.footnote}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-panel border border-line bg-white p-5 sm:p-6">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">How the lab relates to this report</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              The lab is an illustrative model run on one engine. It is not fitted to, and does not reproduce, the measured
              slots above, and its results change with network size and conditions. Ratios of traditional to mump2p
              (higher means mump2p did better):
            </p>
          </div>
          <div className="num overflow-hidden rounded-2xl border border-line text-sm">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-paper px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-3">
              <span />
              <span>Report</span>
              <span>Lab · {size} peers · {condition}</span>
            </div>
            <div className="grid grid-cols-[1.4fr_1fr_1fr] border-t border-line px-4 py-3">
              <span className="text-ink-2">Propagation spread</span>
              <span className="font-medium">{reportRatio.toFixed(2)}×</span>
              <span className="font-medium">{simSpread === null ? "—" : `${simSpread.toFixed(2)}×`}</span>
            </div>
            <div className="grid grid-cols-[1.4fr_1fr_1fr] border-t border-line px-4 py-3">
              <span className="text-ink-2">p95 arrival</span>
              <span className="font-medium">{reportP95.toFixed(2)}×</span>
              <span className="font-medium">{simP95 === null ? "—" : `${simP95.toFixed(2)}×`}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-3">
        Source: the mump2p performance report published on{" "}
        <a className="underline hover:text-ink" href={REPORT.sourceUrl} target="_blank" rel="noreferrer">
          Optimum Hub
        </a>
        , shown as supplied. The report’s subtitle states 50,136 slots and its measurement basis states 50,129 slots.
      </p>
    </section>
  );
}
