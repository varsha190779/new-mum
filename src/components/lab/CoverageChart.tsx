export interface Series {
  label: string;
  color: string;
  points: { t: number; cov: number }[];
  dashed?: boolean;
  width?: number;
}

const W = 340;
const H = 168;
const PAD = { l: 34, r: 10, t: 10, b: 26 };

function niceStep(max: number) {
  const raw = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
}

/** Peers reconstructed (%) over simulated time. */
export function CoverageChart({ series, maxT, title }: { series: Series[]; maxT: number; title: string }) {
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (t: number) => PAD.l + (Math.min(t, maxT) / maxT) * iw;
  const y = (c: number) => PAD.t + (1 - c) * ih;
  const step = niceStep(maxT);
  const ticks: number[] = [];
  for (let t = 0; t <= maxT + 1e-6; t += step) ticks.push(t);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={title}>
      {[0, 0.5, 1].map((c) => (
        <g key={c}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(c)} y2={y(c)} stroke="#E6E6E0" strokeWidth="1" />
          <text x={PAD.l - 6} y={y(c) + 3.5} textAnchor="end" fontSize="9.5" fill="#6B726D">
            {Math.round(c * 100)}%
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="#6B726D">
          {Number.isInteger(t) ? t : t.toFixed(1)}s
        </text>
      ))}
      {series.map((s) => {
        if (s.points.length < 2) return null;
        const d = s.points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.cov).toFixed(1)}`).join(" ");
        return (
          <path
            key={s.label}
            d={d}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width ?? 2}
            strokeDasharray={s.dashed ? "4 4" : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <svg width="16" height="4" aria-hidden="true">
            <line x1="0" x2="16" y1="2" y2="2" stroke={i.color} strokeWidth="2" strokeDasharray={i.dashed ? "3 3" : undefined} />
          </svg>
          {i.label}
        </li>
      ))}
    </ul>
  );
}
