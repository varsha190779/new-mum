"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { Simulation, type Condition, type Mode } from "@/lib/sim/engine";
import { NETWORK_SIZES } from "@/lib/sim/graph";
import { useObservatory } from "../ObservatoryContext";
import { ControlButton, Segmented, useMediaQuery } from "./ui";
import { NetworkCanvas } from "./NetworkCanvas";
import { MetricsPanel } from "./MetricsPanel";
import { StepFlow } from "./StageStrip";
import { RunResults } from "./RunResults";

type Status = "idle" | "running" | "paused" | "complete";

export function NetworkLab() {
  const { size, condition, setSize, setCondition } = useObservatory();
  const [mode, setMode] = useState<Mode>("mump2p");
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [sim, setSim] = useState(() => new Simulation({ size, condition, mode }));
  const [frame, bump] = useReducer((n: number) => n + 1, 0);
  const vertical = useMediaQuery("(max-width: 719px)");

  const fresh = useCallback(() => new Simulation({ size, condition, mode }), [size, condition, mode]);

  // any settings change returns the lab to a clean, idle run
  useEffect(() => {
    setSim(fresh());
    setStatus("idle");
  }, [fresh]);

  useEffect(() => {
    if (status !== "running") return;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      sim.advance(dt * speed);
      bump();
      if (sim.finished) {
        setStatus("complete");
        return;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [status, sim, speed]);

  const replay = () => {
    setSim(fresh());
    setStatus("running");
  };
  const reset = () => {
    setSim(fresh());
    setStatus("idle");
  };
  const primary = () => {
    if (status === "running") setStatus("paused");
    else if (status === "complete") replay();
    else setStatus("running");
  };

  const primaryLabel =
    status === "running" ? "Pause" : status === "paused" ? "Resume" : status === "complete" ? "Run again" : "Start";

  return (
    <section id="lab" className="mx-auto max-w-[1200px] px-4 pb-6 sm:px-6">
      <div className="panel p-3 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1 pb-4 pt-1">
          <div>
            <p className="eyebrow">Network Propagation Lab</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]">
              Watch a block travel through the network.
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-2">
              Compare how traditional P2P and mump2p distribute blockchain data between peers.
            </p>
          </div>
          <div className="max-w-xs space-y-1.5 sm:text-right">
            <a
              href="#report"
              className="inline-block rounded-full border border-line bg-paper px-3 py-1 text-[11px] font-medium text-ink-2 hover:border-ink-4"
            >
              Illustrative simulation based on a historical performance report.
            </a>
            <p className="text-[12px] leading-relaxed text-ink-3">Press Start, then hover any node for its status.</p>
          </div>
        </div>

        {/* controls */}
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4 rounded-2xl border border-line bg-[#FBFBF9] p-3.5 sm:p-4">
          <Segmented<Mode>
            label="Propagation mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "traditional", label: "Traditional P2P" },
              { value: "mump2p", label: "mump2p + RLNC" },
            ]}
          />
          <Segmented<number>
            label="Network size"
            value={size}
            onChange={setSize}
            options={NETWORK_SIZES.map((n) => ({ value: n, label: `${n} peers` }))}
          />
          <Segmented<Condition>
            label="Conditions"
            value={condition}
            onChange={setCondition}
            options={[
              { value: "stable", label: "Stable" },
              { value: "congested", label: "Congested" },
            ]}
          />
          <Segmented<number>
            label="Speed"
            value={speed}
            onChange={setSpeed}
            options={[
              { value: 0.5, label: "0.5×" },
              { value: 1, label: "1×" },
              { value: 2, label: "2×" },
            ]}
          />
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <ControlButton variant="primary" onClick={primary}>
              {status === "running" ? (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <rect x="2" y="1.5" width="3" height="9" rx="1" fill="currentColor" />
                  <rect x="7" y="1.5" width="3" height="9" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
                </svg>
              )}
              {primaryLabel}
            </ControlButton>
            <ControlButton onClick={reset} disabled={status === "idle"}>
              Reset
            </ControlButton>
            <ControlButton onClick={replay} disabled={status === "idle"}>
              Replay
            </ControlButton>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${mode === "mump2p" ? "bg-accent" : "bg-ink"}`} />
          <p className="text-sm leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">{mode === "mump2p" ? "mump2p + RLNC. " : "Traditional P2P. "}</span>
            {mode === "mump2p"
              ? "Peers exchange coded packets. A receiver can reconstruct the block after collecting enough independent information, without waiting for a specific missing packet."
              : "Peers forward original data to other peers. A receiver may need to wait for missing pieces before it can reconstruct the block."}
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0 space-y-3">
            <div className="relative overflow-hidden rounded-2xl border border-line bg-[#FBFBF9] p-2 sm:p-4">
              <NetworkCanvas sim={sim} mode={mode} vertical={vertical} frame={frame} />
              {status === "idle" && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                  <span className="rounded-full border border-line bg-white/90 px-3.5 py-1.5 text-xs text-ink-2 shadow-soft backdrop-blur">
                    Press Start to send the block from the source
                  </span>
                </div>
              )}
            </div>
            <StepFlow sim={sim} mode={mode} frame={frame} />
            <Legend mode={mode} />
          </div>
          <div className="rounded-2xl border border-line p-3.5 sm:p-4">
            <MetricsPanel sim={sim} mode={mode} frame={frame} />
          </div>
        </div>
        <div className="mt-4">
          {status === "complete" ? (
            <RunResults mode={mode} size={size} condition={condition} />
          ) : (
            <p className="rounded-2xl border border-dashed border-line-2 px-4 py-4 text-center text-sm text-ink-3">
              When the run finishes, this area explains what happened and compares both modes under the same conditions.
            </p>
          )}
        </div>
        <p aria-live="polite" className="sr-only">
          {status === "complete" ? `Run complete. ${sim.doneCount} of ${sim.peerCount} peers reconstructed.` : ""}
        </p>
      </div>
    </section>
  );
}

function Legend({ mode }: { mode: Mode }) {
  const item = "flex items-center gap-2";
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 px-1 text-xs text-ink-3">
      {mode === "traditional" ? (
        <li className={item}>
          <svg width="30" height="14" aria-hidden="true">
            <rect x="0" y="0" width="13" height="13" rx="3.5" fill="#146B39" />
            <rect x="16" y="0" width="13" height="13" rx="3.5" fill="#3FA66B" />
          </svg>
          Original piece (colour and number = piece)
        </li>
      ) : (
        <li className={item}>
          <svg width="30" height="12" aria-hidden="true">
            <circle cx="6" cy="6" r="5" fill="#1E8A4C" />
            <circle cx="6" cy="6" r="2" fill="#fff" />
            <circle cx="22" cy="6" r="5" fill="#146B39" />
            <circle cx="22" cy="6" r="2" fill="#9FD1B3" />
          </svg>
          Coded packet (a different mix each)
        </li>
      )}
      <li className={item}>
        <svg width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke="#E3E3DC" strokeWidth="2.5" />
          <circle cx="8" cy="8" r="6" fill="none" stroke="#1E8A4C" strokeWidth="2.5" strokeDasharray="22 38" transform="rotate(-90 8 8)" />
        </svg>
        {mode === "mump2p" ? "Independent packets collected" : "Distinct pieces collected"}
      </li>
      <li className={item}>
        <svg width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="#1E8A4C" />
        </svg>
        Reconstructed
      </li>
      <li className={item}>
        <svg width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke="#9AA09B" strokeDasharray="3 3" />
        </svg>
        {mode === "traditional" ? "Duplicate arrival" : "Arrival that added nothing new"}
      </li>
      <li className={item}>
        <svg width="14" height="14" aria-hidden="true">
          <path d="M2 2l10 10M12 2L2 12" stroke="#B4572F" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Lost in transit
      </li>
    </ul>
  );
}
