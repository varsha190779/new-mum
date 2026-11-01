import type { Mode, Simulation } from "@/lib/sim/engine";
import { CoverageChart, ChartLegend } from "./CoverageChart";
import { runToCompletion } from "@/lib/sim/engine";

function Tile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-[#FBFBF9] p-3.5">
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className="num mt-1 text-[22px] font-semibold leading-none tracking-tight">
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-ink-3">{unit}</span>}
      </div>
      {sub && <div className="num mt-1.5 text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}

export function MetricsPanel({ sim, mode, frame }: { sim: Simulation; mode: Mode; frame: number }) {
  void frame;
  const c = sim.counters;
  const done = sim.doneCount;
  const p95 = sim.p95Done;
  const other: Mode = mode === "mump2p" ? "traditional" : "mump2p";
  const ghost = runToCompletion({ size: sim.cfg.size, condition: sim.cfg.condition, mode: other });
  const mine = [...sim.history, { t: sim.time, cov: done / sim.peerCount }];
  const maxT = Math.max(4, Math.ceil(Math.max(ghost.history.at(-1)?.t ?? 0, mine.at(-1)?.t ?? 0) + 0.5));
  const sharePct = c.delivered ? Math.round((c.redundant / c.delivered) * 100) : 0;
  const label = mode === "mump2p" ? "mump2p + RLNC" : "Traditional P2P";
  const otherLabel = mode === "mump2p" ? "Traditional P2P" : "mump2p + RLNC";

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Run metrics</h3>
        <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-3">
          Simulated
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Tile label="Peers reconstructed" value={`${done}`} unit={`/ ${sim.peerCount}`} sub={`${Math.round((done / sim.peerCount) * 100)}% coverage`} />
        <Tile label="Elapsed" value={sim.time.toFixed(1)} unit="sim s" sub={sim.finished ? "run complete" : "simulated time"} />
        <Tile label="95% of peers by" value={p95 === null ? "—" : p95.toFixed(1)} unit={p95 === null ? undefined : "sim s"} sub="time to reconstruct" />
        <Tile label="Packets sent" value={`${c.sent}`} sub={`${c.lost} lost in transit`} />
        <Tile label="Redundant data" value={c.redundantUnits.toFixed(1)} unit="blocks" sub={`${sharePct}% of deliveries`} />
        <Tile label="Data moved" value={c.dataUnits.toFixed(1)} unit="blocks" sub="block-equivalents" />
      </div>
      <div className="rounded-2xl border border-line bg-[#FBFBF9] p-3.5">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[11px] text-ink-3">Coverage over simulated time</span>
        </div>
        <CoverageChart
          title={`Percent of peers reconstructed over simulated time for ${label}, with ${otherLabel} dashed for reference`}
          maxT={maxT}
          series={[
            { label: otherLabel, color: "#B8BDB9", points: ghost.history, dashed: true, width: 1.6 },
            { label, color: mode === "mump2p" ? "#1E8A4C" : "#0C100D", points: mine },
          ]}
        />
        <ChartLegend
          items={[
            { label, color: mode === "mump2p" ? "#1E8A4C" : "#0C100D" },
            { label: `${otherLabel} (same settings)`, color: "#B8BDB9", dashed: true },
          ]}
        />
      </div>
      <p className="mt-auto text-[11px] leading-relaxed text-ink-3">
        Values come from a small local model with fixed seeds. They are not real-time Optimum telemetry and
        do not predict real-network performance.
      </p>
    </div>
  );
}
