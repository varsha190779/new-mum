"use client";

import { useMemo } from "react";
import { K, runToCompletion, type RunSummary } from "@/lib/sim/engine";
import { useObservatory } from "./ObservatoryContext";
import { ChartLegend, CoverageChart } from "./lab/CoverageChart";

const TINT = ["#1E8A4C", "#146B39", "#3FA66B", "#0C100D"];

function Schematic({ kind }: { kind: "traditional" | "mump2p" }) {
  const ups = [44, 100, 156];
  const trad = kind === "traditional";
  return (
    <svg viewBox="0 0 360 200" className="block w-full" role="img" aria-label={trad ? "Three peers each send an identical full block copy to one receiver" : "Three peers each send a different coded packet to one receiver"}>
      {ups.map((y, i) => (
        <g key={y}>
          <line x1="52" y1={y} x2="290" y2="100" stroke="#E3E3DC" strokeWidth="1.5" />
          <circle cx="40" cy={y} r="11" fill="#fff" stroke="#C9C9C0" strokeWidth="1.5" />
          {trad ? (
            <g transform={`translate(${150 + (i === 1 ? 14 : 0) - (i === 0 ? 0 : 0)} ${y + (100 - y) * 0.42 - 7})`} opacity={i === 0 ? 1 : 0.38}>
              <rect width="22" height="14" rx="3.5" fill="#0C100D" />
              <path d="M7 0v14M15 0v14M0 7h22" stroke="#6B726D" strokeWidth="0.8" />
            </g>
          ) : (
            <g transform={`translate(${160 + i * 6} ${y + (100 - y) * 0.45})`}>
              <circle r="7" fill={TINT[i]} />
              <circle r="2.8" fill={["#fff", "#9FD1B3", "#CFE8D9"][i]} />
            </g>
          )}
        </g>
      ))}
      {ups.map((y, i) => (
        <text key={y} x="40" y={y + 28} textAnchor="middle" fontSize="10.5" fill={trad ? (i === 0 ? "#3A413C" : "#9AA09B") : "#146B39"}>
          {trad ? (i === 0 ? "useful" : "duplicate") : i === 2 ? "+1 new*" : "+1 new"}
        </text>
      ))}
      <circle cx="302" cy="100" r="22" fill={trad ? "#1E8A4C" : "#fff"} stroke={trad ? "#146B39" : "#C9C9C0"} strokeWidth="1.5" />
      {trad ? (
        <path d="M293 100l6 6 11-12" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <circle cx="302" cy="100" r="28" fill="none" stroke="#1E8A4C" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 28 * 0.75} 999`} transform="rotate(-90 302 100)" />
          <text x="302" y="104" textAnchor="middle" fontSize="12" fontWeight="600" fill="#0C100D" className="num">6/{K}</text>
        </>
      )}
    </svg>
  );
}

function fmt(v: number | null, d = 1) {
  return v === null ? "—" : v.toFixed(d);
}

const ROWS: { label: string; get: (r: RunSummary) => string; unit?: string }[] = [
  { label: "Peers reconstructed", get: (r) => `${r.done} / ${r.peers}` },
  { label: "Median reconstruction", get: (r) => fmt(r.median), unit: "sim s" },
  { label: "Last peer reconstructed", get: (r) => fmt(r.lastDone), unit: "sim s" },
  { label: "Redundant data", get: (r) => fmt(r.redundantUnits), unit: "blocks" },
  { label: "Data moved", get: (r) => fmt(r.dataUnits), unit: "blocks" },
  { label: "Packets lost", get: (r) => `${r.lost}` },
];

const DIFFS = [
  ["What is forwarded", "The whole block, as an identical copy", "Coded packets, each a different combination"],
  ["When relaying starts", "After a full copy has arrived", "Once a peer holds enough shards, before the message is complete"],
  ["Duplicate arrivals", "Identical copies carry nothing new", "Independent packets each add information"],
  ["When something is lost", "That particular copy has to be resent or found elsewhere", "Any further independent packet fills the gap"],
];

export function Comparison() {
  const { size, condition } = useObservatory();
  const [trad, mump] = useMemo(
    () => [
      runToCompletion({ size, condition, mode: "traditional" }),
      runToCompletion({ size, condition, mode: "mump2p" }),
    ],
    [size, condition],
  );
  const maxT = Math.max(4, Math.ceil(Math.max(trad.history.at(-1)?.t ?? 0, mump.history.at(-1)?.t ?? 0) + 0.5));

  return (
    <section id="compare" className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow">Compare</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">
            Traditional P2P vs mump2p + RLNC
          </h2>
        </div>
        <p className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs text-ink-2">
          Simulated · {size} peers · {condition}
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {(
          [
            ["traditional", "Traditional gossip forwarding", "Each peer relays whole messages to its mesh peers (as in GossipSub-style gossip), so several neighbours often deliver the same message."],
            ["mump2p", "mump2p + RLNC", "Peers relay recoded shards on the same kind of mesh. Shards from different neighbours can each add new information, and decoded peers tell neighbours to stop sending."],
          ] as const
        ).map(([k, title, text]) => (
          <article key={k} className="panel p-5 sm:p-6">
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{text}</p>
            <div className="mt-4 rounded-2xl bg-[#FBFBF9] p-3">
              <Schematic kind={k} />
            </div>
            {k === "mump2p" && (
              <p className="mt-2 text-[11px] text-ink-3">
                * Independence is likely, not guaranteed. A dependent packet adds nothing, so a peer may need a few more than {K}.
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="panel mt-4 p-5 sm:p-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">Same network, same conditions</h3>
              <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-3">
                Simulated
              </span>
            </div>
            <div className="num mt-4 overflow-hidden rounded-2xl border border-line text-sm">
              <div className="grid grid-cols-[1.3fr_1fr_1fr] bg-paper px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-3">
                <span />
                <span>Traditional</span>
                <span>mump2p</span>
              </div>
              {ROWS.map((r) => (
                <div key={r.label} className="grid grid-cols-[1.3fr_1fr_1fr] items-baseline border-t border-line px-4 py-3">
                  <span className="text-ink-2">{r.label}</span>
                  <span className="font-medium">
                    {r.get(trad)} {r.unit && <span className="text-xs font-normal text-ink-3">{r.unit}</span>}
                  </span>
                  <span className="font-medium text-accent-dark">
                    {r.get(mump)} {r.unit && <span className="text-xs font-normal text-ink-3">{r.unit}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Peers reconstructed over time</h3>
            <div className="mt-4 rounded-2xl border border-line bg-[#FBFBF9] p-3.5">
              <CoverageChart
                title="Percent of peers reconstructed over simulated time, traditional versus mump2p"
                maxT={maxT}
                series={[
                  { label: "Traditional P2P", color: "#0C100D", points: trad.history },
                  { label: "mump2p + RLNC", color: "#1E8A4C", points: mump.history, width: 2.4 },
                ]}
              />
              <div className="mt-1">
                <ChartLegend items={[{ label: "Traditional P2P", color: "#0C100D" }, { label: "mump2p + RLNC", color: "#1E8A4C" }]} />
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-3">
              Uses the network size and conditions chosen in the lab. Results come from a simplified seeded model and
              vary by setting; they illustrate the mechanics rather than measure any real network.
            </p>
          </div>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line overflow-hidden rounded-panel border border-line bg-white">
        {DIFFS.map(([k, a, b]) => (
          <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[200px_1fr_1fr] sm:gap-6 sm:px-6">
            <dt className="text-sm font-semibold">{k}</dt>
            <dd className="text-sm text-ink-3">
              <span className="mr-2 text-[10px] font-medium uppercase tracking-wider text-ink-4 sm:hidden">Traditional</span>
              {a}
            </dd>
            <dd className="text-sm text-ink-2">
              <span className="mr-2 text-[10px] font-medium uppercase tracking-wider text-accent sm:hidden">mump2p</span>
              {b}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
