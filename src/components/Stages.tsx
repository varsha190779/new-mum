"use client";

import { useState } from "react";
import { K } from "@/lib/sim/engine";

const PIECE_FILL = ["#1E8A4C", "#3FA66B", "#146B39"];

function StageOne() {
  return (
    <svg viewBox="0 0 240 150" className="block w-full" role="img" aria-label="A block divided into eight pieces">
      <rect x="22" y="22" width="196" height="76" rx="12" fill="#fff" stroke="#D5D5CD" />
      {Array.from({ length: K }).map((_, i) => (
        <g key={i}>
          <rect
            x={32 + (i % 4) * 46}
            y={32 + Math.floor(i / 4) * 33}
            width="40"
            height="28"
            rx="6"
            fill={PIECE_FILL[i % 3]}
            opacity={0.92 - (i % 3) * 0.1}
          />
          <text x={52 + (i % 4) * 46} y={50 + Math.floor(i / 4) * 33} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">
            P{i + 1}
          </text>
        </g>
      ))}
      <text x="120" y="126" textAnchor="middle" fontSize="11" fill="#6B726D">
        1 block → {K} pieces
      </text>
    </svg>
  );
}

const MIX = [
  [1, 0, 1, 1, 0, 0, 1, 0],
  [0, 1, 1, 0, 1, 1, 0, 1],
  [1, 1, 0, 0, 1, 0, 1, 1],
];

function StageTwo() {
  return (
    <svg viewBox="0 0 240 150" className="block w-full" role="img" aria-label="Three coded packets, each a different combination of the pieces">
      {MIX.map((row, r) => (
        <g key={r} transform={`translate(0 ${14 + r * 38})`}>
          <rect x="14" y="0" width="212" height="30" rx="15" fill="#fff" stroke="#D5D5CD" />
          <text x="30" y="19" fontSize="11" fontWeight="600" fill="#0C100D">
            C{r + 1}
          </text>
          {row.map((on, i) => (
            <circle key={i} cx={64 + i * 20} cy="15" r="5.5" fill={on ? PIECE_FILL[i % 3] : "#fff"} stroke={on ? "none" : "#D5D5CD"} />
          ))}
        </g>
      ))}
      <text x="120" y="136" textAnchor="middle" fontSize="11" fill="#6B726D">
        each = random mix of pieces
      </text>
    </svg>
  );
}

function StageThree() {
  const nodes = [
    [28, 75], [100, 32], [100, 75], [100, 118], [190, 52], [190, 102],
  ];
  const edges = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [2, 5], [3, 5]];
  return (
    <svg viewBox="0 0 240 150" className="block w-full" role="img" aria-label="Coded packets flowing from a source across peers">
      {edges.map(([a, b], i) => (
        <g key={i}>
          <line x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#E3E3DC" strokeWidth="1.5" />
          <line
            className="flow-line"
            x1={nodes[a][0]}
            y1={nodes[a][1]}
            x2={nodes[b][0]}
            y2={nodes[b][1]}
            stroke="#1E8A4C"
            strokeWidth="1.6"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        </g>
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 11 : 8} fill={i === 0 ? "#0C100D" : "#fff"} stroke={i === 0 ? "#0C100D" : "#C9C9C0"} strokeWidth="1.5" />
      ))}
      <text x="120" y="146" textAnchor="middle" fontSize="11" fill="#6B726D">
        peers recode and relay
      </text>
    </svg>
  );
}

function RankDemo() {
  const [log, setLog] = useState<boolean[]>([]);
  const rank = log.filter(Boolean).length;
  const done = rank >= K;
  const receive = () => {
    if (done) return;
    // illustrative only: dependent packets are rare but possible
    const dependent = rank > 0 && Math.random() < 0.15;
    setLog((l) => [...l, !dependent]);
  };
  return (
    <div className="mt-4 rounded-2xl border border-line bg-[#FBFBF9] p-3.5">
      <div className="flex gap-[3px]" role="img" aria-label={`${rank} of ${K} independent packets collected`}>
        {Array.from({ length: K }).map((_, i) => (
          <span key={i} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i < rank ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>
      <div className="mt-2.5 flex min-h-[22px] flex-wrap gap-1" aria-hidden="true">
        {log.map((ok, i) => (
          <span
            key={i}
            className={`num flex h-[22px] w-[22px] items-center justify-center rounded-md text-[10px] font-medium ${
              ok ? "bg-accent-soft text-accent-dark" : "bg-line text-ink-3 line-through"
            }`}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <p className="num mt-2 text-xs text-ink-2" aria-live="polite">
        {done
          ? `Reconstructed after ${log.length} packets (${log.length - K} dependent).`
          : log.length
            ? `${rank}/${K} independent so far from ${log.length} received.`
            : "Receive packets to fill the rank meter."}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={receive}
          disabled={done}
          className="h-9 rounded-full bg-ink px-4 text-xs font-medium text-white transition-colors hover:bg-ink-2 disabled:opacity-40"
        >
          Receive a packet
        </button>
        <button
          type="button"
          onClick={() => setLog([])}
          className="h-9 rounded-full border border-line-2 bg-white px-4 text-xs font-medium hover:border-ink-4"
        >
          Reset
        </button>
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-ink-3">
        Illustrative: a packet occasionally adds nothing new, so a peer may need more than {K} packets.
      </p>
    </div>
  );
}

function StageFour() {
  return (
    <svg viewBox="0 0 240 150" className="block w-full" role="img" aria-label="A peer assembling pieces back into the original block">
      <g transform="translate(22 14)">
        {Array.from({ length: K }).map((_, i) => (
          <rect key={i} x={(i % 4) * 46} y={Math.floor(i / 4) * 33} width="40" height="28" rx="6" fill="none" stroke="#1E8A4C" strokeWidth="1.5" strokeDasharray="3 3" />
        ))}
      </g>
      {Array.from({ length: K }).map((_, i) => (
        <rect
          key={i}
          x={32 + (i % 4) * 46}
          y={28 + Math.floor(i / 4) * 33}
          width="40"
          height="28"
          rx="6"
          fill={PIECE_FILL[i % 3]}
          opacity={0.92 - (i % 3) * 0.1}
        />
      ))}
      <circle cx="120" cy="116" r="10" fill="#1E8A4C" />
      <path d="M115 116l3.5 3.5 6.5-7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="120" y="142" textAnchor="middle" fontSize="11" fill="#6B726D">
        original block recovered
      </text>
    </svg>
  );
}

const STAGES = [
  {
    title: "Original data",
    body: `A block is divided into ${K} equal pieces. Traditional forwarding keeps it whole.`,
    art: <StageOne />,
  },
  {
    title: "Coded packets",
    body: "RLNC builds each packet as a random linear combination of the pieces, so every coded packet looks different from the others.",
    art: <StageTwo />,
  },
  {
    title: "Network propagation",
    body: "Coded packets spread across peers. A peer can recode what it already holds and relay it without waiting for the whole block.",
    art: <StageThree />,
  },
  {
    title: "Reconstruction",
    body: `A peer rebuilds the block once it has gathered ${K} independent coded packets, the same count as pieces. Dependent packets add nothing, so it can need slightly more.`,
    art: <StageFour />,
  },
];

export function Stages() {
  return (
    <section id="how" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-2xl">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">
          From one block to many coded packets, and back.
        </h2>
      </div>
      <div className="panel mt-10 overflow-hidden">
        <ol className="grid divide-y divide-line md:grid-cols-2 md:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {STAGES.map((s, i) => (
            <li
              key={s.title}
              className="p-5 sm:p-6 md:[&:nth-child(n+3)]:border-t md:[&:nth-child(n+3)]:border-line lg:[&:nth-child(n+3)]:border-t-0 md:[&:nth-child(even)]:border-l md:[&:nth-child(even)]:border-line lg:[&:nth-child(even)]:border-l-0"
            >
              <div className="flex items-center gap-3">
                <span className="num flex h-7 w-7 items-center justify-center rounded-full border border-line-2 text-xs font-semibold">
                  {i + 1}
                </span>
                <h3 className="text-[15px] font-semibold tracking-tight">{s.title}</h3>
              </div>
              <div className="mt-5 rounded-2xl bg-[#FBFBF9] p-3">{s.art}</div>
              <p className="mt-4 text-sm leading-relaxed text-ink-2">{s.body}</p>
              {i === 3 && <RankDemo />}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
