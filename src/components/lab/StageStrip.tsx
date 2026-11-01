import { K, type Mode, type Simulation } from "@/lib/sim/engine";

const STEPS: Record<Mode, { title: string; body: string }[]> = {
  traditional: [
    { title: "Block created", body: `The source holds the block as ${K} original pieces.` },
    { title: "Packets sent", body: "Each original piece is sent to a neighbouring peer." },
    { title: "Peers receive data", body: "Peers pass pieces on unchanged. The same piece can arrive more than once." },
    { title: "Block reconstructed", body: "A peer can rebuild the block only after every original piece has arrived." },
  ],
  mump2p: [
    { title: "Block created", body: `The source splits the block into ${K} pieces.` },
    { title: "Packets sent", body: "It sends coded packets: different mixes of those pieces." },
    { title: "Peers receive data", body: "Peers collect coded packets and pass on new mixes." },
    { title: "Block reconstructed", body: "A peer rebuilds the block once it holds enough independent packets, whichever they are." },
  ],
};

/** 0 = block created … 3 = reconstructing, 4 = run finished */
export function stageIndex(sim: Simulation): number {
  if (sim.time === 0) return 0;
  if (sim.finished) return 4;
  if (!sim.anyPeerReceived) return 1;
  if (sim.doneCount === 0) return 2;
  return 3;
}

export function StepFlow({ sim, mode, frame }: { sim: Simulation; mode: Mode; frame: number }) {
  void frame;
  const idx = stageIndex(sim);
  return (
    <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Current step of the run">
      {STEPS[mode].map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "active" : "todo";
        return (
          <li
            key={s.title}
            aria-current={state === "active" ? "step" : undefined}
            className={[
              "rounded-xl border px-3.5 py-3 transition-all duration-300",
              state === "active"
                ? "border-accent/40 bg-accent-soft"
                : state === "done"
                  ? "border-line bg-white"
                  : "border-line bg-transparent",
            ].join(" ")}
          >
            <div className="flex items-center gap-2.5 text-[13px] font-medium">
              <span
                className={[
                  "num flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  state === "todo" ? "bg-line text-ink-3" : "bg-accent text-white",
                ].join(" ")}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={state === "todo" ? "text-ink-3" : "text-ink"}>{s.title}</span>
            </div>
            <p className={`mt-1.5 text-xs leading-relaxed ${state === "todo" ? "text-ink-4" : "text-ink-2"}`}>{s.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
