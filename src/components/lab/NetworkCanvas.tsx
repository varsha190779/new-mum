"use client";

import { useMemo, useState } from "react";
import { K, type Mode, type Simulation } from "@/lib/sim/engine";

const TINT = ["#1E8A4C", "#3FA66B", "#146B39", "#0C100D"];
const TINT_IN = ["#FFFFFF", "#CFE8D9", "#9FD1B3", "#E7F3EB"];
const PULSE_LIFE = 0.9;

interface Layout {
  W: number;
  H: number;
  px: (u: number, v: number) => { x: number; y: number };
  r: number;
}

function layoutFor(vertical: boolean): Layout {
  return vertical
    ? { W: 520, H: 780, r: 12, px: (u, v) => ({ x: 36 + v * 448, y: 46 + u * 650 }) }
    : { W: 1000, H: 540, r: 11, px: (u, v) => ({ x: 64 + u * 872, y: 34 + v * 430 }) };
}

function Check({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x - 4 * s} ${y + 0.3 * s} l${2.8 * s} ${2.8 * s} l${5.2 * s} ${-5.6 * s}`}
      fill="none"
      stroke="#fff"
      strokeWidth={1.9 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function NetworkCanvas({
  sim,
  mode,
  vertical,
  frame,
}: {
  sim: Simulation;
  mode: Mode;
  vertical: boolean;
  /** changes every animation frame to re-render from mutable sim state */
  frame: number;
}) {
  void frame;
  const [hover, setHover] = useState<number | null>(null);
  const L = useMemo(() => layoutFor(vertical), [vertical]);
  const topo = sim.topo;
  const pos = useMemo(() => topo.nodes.map((n) => L.px(n.u, n.v)), [topo, L]);

  const active = new Set<string>();
  const flying: React.ReactNode[] = [];
  for (const p of sim.packets) {
    if (sim.time < p.start) continue;
    const prog = (sim.time - p.start) / Math.max(0.001, p.arrive - p.start);
    if (prog < 0 || prog >= 1) continue;
    active.add(p.from < p.to ? `${p.from}-${p.to}` : `${p.to}-${p.from}`);
    const a = pos[p.from];
    const b = pos[p.to];
    const q = p.lost ? Math.min(prog, 0.55) : prog;
    const x = a.x + (b.x - a.x) * q;
    const y = a.y + (b.y - a.y) * q;
    const fade = p.lost ? Math.max(0, 1 - Math.max(0, prog - 0.55) / 0.2) : 1;
    if (fade <= 0) continue;
    if (p.lost) {
      flying.push(
        <g key={p.id} opacity={fade} transform={`translate(${x} ${y})`}>
          <path d="M-4 -4l8 8M4 -4l-8 8" stroke="#B4572F" strokeWidth="1.8" strokeLinecap="round" />
        </g>,
      );
    } else if (p.kind === "full") {
      flying.push(
        <g key={p.id} transform={`translate(${x} ${y})`}>
          <rect x="-9" y="-6" width="18" height="12" rx="3" fill="#0C100D" />
          <path d="M-3 -6v12M3 -6v12M-9 0h18" stroke="#6B726D" strokeWidth="0.8" />
        </g>,
      );
    } else {
      flying.push(
        <g key={p.id} transform={`translate(${x} ${y})`}>
          <circle r="5" fill={TINT[p.tint]} />
          <circle r="2" fill={TINT_IN[p.tint2]} />
        </g>,
      );
    }
  }

  const hovered = hover !== null ? topo.nodes[hover] : null;
  const hp = hover !== null ? pos[hover] : null;
  const hn = hover !== null ? sim.nodes[hover] : null;
  const xFrac = hp ? hp.x / L.W : 0;
  const tipShift = xFrac < 0.2 ? "0%" : xFrac > 0.8 ? "-100%" : "-50%";

  const statusText = (id: number) => {
    const n = sim.nodes[id];
    if (id === 0) return mode === "mump2p" ? "Origin: emits coded packets" : "Origin: sends full copies";
    if (n.doneAt !== null) return `Reconstructed at ${n.doneAt.toFixed(1)}s`;
    if (mode === "mump2p" && n.rank > 0) return `Collecting: ${n.rank}/${K} independent packets`;
    return mode === "mump2p" ? "Waiting for coded packets" : "Waiting for a full copy";
  };

  const srcPos = pos[0];
  const pieceX = vertical ? srcPos.x + 34 : srcPos.x - 22;
  const pieceY = vertical ? srcPos.y - 14 : srcPos.y - 66;

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${L.W} ${L.H}`}
        className="block h-auto w-full select-none"
        role="group"
        aria-label={`Network diagram with one source and ${sim.peerCount} peers. Hover or focus a node for its status.`}
      >
        {!vertical &&
          Array.from({ length: topo.layers }).map((_, l) => {
            const x = L.px(l / (topo.layers - 1), 0).x;
            return (
              <text key={l} x={x} y={L.H - 14} textAnchor="middle" fontSize="11" fill="#9AA09B" letterSpacing="1.2">
                {l === 0 ? "SOURCE" : `HOP ${l}`}
              </text>
            );
          })}

        {/* edges */}
        {topo.edges.map((e) => {
          const a = pos[e.a];
          const b = pos[e.b];
          const on = active.has(e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`);
          return (
            <line
              key={`${e.a}-${e.b}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={on ? "#9FD1B3" : "#E3E3DC"}
              strokeWidth={on ? 1.8 : 1.2}
              style={{ transition: "stroke 0.25s, stroke-width 0.25s" }}
            />
          );
        })}

        {/* source data: one block vs K pieces */}
        <g transform={`translate(${pieceX} ${pieceY})`} aria-hidden="true">
          {mode === "traditional" ? (
            <>
              <rect width="44" height="20" rx="4" fill="#0C100D" />
              <text x="22" y="-7" textAnchor="middle" fontSize="10" fill="#6B726D">
                1 block
              </text>
            </>
          ) : (
            <>
              {Array.from({ length: K }).map((_, i) => (
                <rect
                  key={i}
                  x={(i % 4) * 11.5}
                  y={Math.floor(i / 4) * 11.5}
                  width="9.5"
                  height="9.5"
                  rx="2"
                  fill={TINT[i % 3]}
                  opacity={0.9 - (i % 3) * 0.12}
                />
              ))}
              <text x="22" y="-7" textAnchor="middle" fontSize="10" fill="#6B726D">
                {K} pieces
              </text>
            </>
          )}
        </g>

        {/* nodes */}
        {topo.nodes.map((n) => {
          const { x, y } = pos[n.id];
          const s = sim.nodes[n.id];
          const isSrc = n.id === 0;
          const done = s.doneAt !== null;
          const rad = isSrc ? 16 : L.r;
          const ringR = rad + 5;
          const circ = 2 * Math.PI * ringR;
          const partial = mode === "mump2p" && !done ? s.rank / K : 0;
          const isHover = hover === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${x} ${y})`}
              tabIndex={0}
              role="button"
              aria-label={`${n.name}: ${statusText(n.id)}`}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setHover(n.id)}
              onFocus={() => setHover(n.id)}
              onBlur={() => setHover((h) => (h === n.id ? null : h))}
              onClick={() => setHover((h) => (h === n.id ? null : n.id))}
              onKeyDown={(e) => e.key === "Escape" && setHover(null)}
            >
              <circle r="24" fill="transparent" />
              {isHover && <circle r={rad + 8} fill="none" stroke="#0C100D" strokeOpacity="0.18" strokeWidth="1.5" />}
              {partial > 0 && (
                <circle
                  r={ringR}
                  fill="none"
                  stroke="#1E8A4C"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${circ * partial} ${circ}`}
                  transform="rotate(-90)"
                />
              )}
              <circle
                r={rad}
                fill={isSrc ? "#0C100D" : done ? "#1E8A4C" : "#FFFFFF"}
                stroke={isSrc ? "#0C100D" : done ? "#146B39" : isHover ? "#0C100D" : "#C9C9C0"}
                strokeWidth="1.5"
                style={{ transition: "fill 0.35s, stroke 0.2s" }}
              />
              {isSrc ? (
                <g fill="#fff" aria-hidden="true">
                  <circle cx="-4" cy="-4" r="2" />
                  <circle cx="4" cy="-4" r="2" />
                  <circle cx="-4" cy="4" r="2" />
                  <circle cx="4" cy="4" r="2" opacity="0.5" />
                </g>
              ) : done ? (
                <Check x={0} y={0} />
              ) : null}
            </g>
          );
        })}

        {/* pulses */}
        {sim.pulses.map((p, i) => {
          const age = (sim.time - p.t) / PULSE_LIFE;
          if (age < 0 || age > 1) return null;
          const { x, y } = pos[p.node];
          return (
            <circle
              key={`${p.node}-${p.t}-${i}`}
              cx={x}
              cy={y}
              r={L.r + age * 14}
              fill="none"
              stroke={p.kind === "done" ? "#1E8A4C" : "#9AA09B"}
              strokeWidth={p.kind === "done" ? 2 : 1.2}
              opacity={(1 - age) * (p.kind === "done" ? 0.8 : 0.55)}
              pointerEvents="none"
            />
          );
        })}

        <g pointerEvents="none">{flying}</g>
      </svg>

      {hovered && hp && hn && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-60 rounded-2xl border border-line bg-white/95 p-3.5 text-left shadow-panel backdrop-blur"
          style={{
            left: `${(hp.x / L.W) * 100}%`,
            top: `${(hp.y / L.H) * 100}%`,
            transform: `translate(${tipShift}, ${hp.y / L.H < 0.3 ? "26px" : "calc(-100% - 22px)"})`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{hovered.name}</span>
            <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-3">
              {hovered.layer === 0 ? "source" : `hop ${hovered.layer}`}
            </span>
          </div>
          <p className={`mt-1.5 text-[13px] ${hn.doneAt !== null ? "font-medium text-accent-dark" : "text-ink-2"}`}>
            {statusText(hovered.id)}
          </p>
          {mode === "mump2p" && hovered.id !== 0 && (
            <div className="mt-2 flex gap-[3px]" aria-hidden="true">
              {Array.from({ length: K }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < hn.rank ? "bg-accent" : "bg-line"}`} />
              ))}
            </div>
          )}
          <dl className="num mt-2.5 grid grid-cols-3 gap-2 border-t border-line pt-2.5 text-[11px] text-ink-3">
            <div>
              <dt>Received</dt>
              <dd className="text-sm font-medium text-ink">{hn.received}</dd>
            </div>
            <div>
              <dt>Redundant</dt>
              <dd className="text-sm font-medium text-ink">{hn.redundant}</dd>
            </div>
            <div>
              <dt>Peers</dt>
              <dd className="text-sm font-medium text-ink">{hovered.neighbors.length}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
