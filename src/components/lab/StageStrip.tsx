import type { Mode, Simulation } from "@/lib/sim/engine";

const LABELS: Record<Mode, string[]> = {
  mump2p: ["Original data", "Coded packets", "Network propagation", "Reconstruction"],
  traditional: ["Original data", "Full copies", "Network propagation", "Receipt"],
};

export function stageIndex(sim: Simulation): number {
  if (sim.time === 0) return 0;
  if (sim.finished) return 4;
  if (!sim.anyPeerReceived) return 1;
  if (sim.doneCount === 0) return 2;
  return 3;
}

export function StageStrip({ sim, mode, frame }: { sim: Simulation; mode: Mode; frame: number }) {
  void frame;
  const idx = stageIndex(sim);
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Current stage of the run">
      {LABELS[mode].map((l, i) => {
        const state = i < idx ? "done" : i === idx ? "active" : "todo";
        return (
          <li
            key={l}
            aria-current={state === "active" ? "step" : undefined}
            className={[
              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] transition-all duration-300",
              state === "active"
                ? "border-accent/40 bg-accent-soft font-medium text-ink"
                : state === "done"
                  ? "border-line bg-white text-ink-2"
                  : "border-line bg-transparent text-ink-4",
            ].join(" ")}
          >
            <span
              className={[
                "num flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                state === "todo" ? "bg-line text-ink-3" : "bg-accent text-white",
              ].join(" ")}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span className="leading-tight">{l}</span>
          </li>
        );
      })}
    </ol>
  );
}
