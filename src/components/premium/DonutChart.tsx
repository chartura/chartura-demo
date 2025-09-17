type Slice = { label: string; value: number };

type DonutProps = {
  data: Slice[];
  title?: string;
  height?: number;
  className?: string;
};

export default function PremiumDonutChart({ data, title, height = 280, className = '' }: DonutProps) {
  const width = 360;
  const cx = width / 2, cy = height / 2;
  const R = Math.min(width, height) * 0.42;
  const r = R * 0.58;

  const total = Math.max(1, data.reduce((s, d) => s + (d.value || 0), 0));

  const palette = ['#0ea5e9', '#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6'];
  let start = -Math.PI / 2;

  const arcs = data.map((d, i) => {
    const ang = (d.value / total) * Math.PI * 2;
    const end = start + ang;
    const mid = (start + end) / 2;
    const large = ang > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
    const lx = cx + (R + 14) * Math.cos(mid), ly = cy + (R + 14) * Math.sin(mid);
    const color = palette[i % palette.length];
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${cx} ${cy} Z`;
    start = end;
    return { path, color, d, lx, ly };
  });

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {title && <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <mask id="donut-hole">
            <rect width={width} height={height} fill="white"/>
            <circle cx={cx} cy={cy} r={r} fill="black"/>
          </mask>
        </defs>
        <g mask="url(#donut-hole)">
          {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} opacity={0.95} />)}
        </g>
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="14" fill="#0f172a">Total</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="16" fontWeight={600} fill="#0f172a">
          {total.toLocaleString()}
        </text>
        {arcs.map((a, i) => (
          <g key={`l${i}`}>
            <circle cx={a.lx} cy={a.ly} r={3} fill={a.color} />
            <text x={a.lx + 6} y={a.ly + 4} fontSize="11" fill="#334155">{a.d.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
