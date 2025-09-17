import { useMemo, useRef, useState } from 'react';

export type DataPoint = Record<string, number | string>;

type LineChartProps = {
  data: DataPoint[];
  xKey: string;
  yKey: string;
  title?: string;
  height?: number;
  className?: string;
};

const scaleLinear = (domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) => {
  const d = domainMax - domainMin || 1;
  const r = rangeMax - rangeMin;
  return (v: number) => rangeMin + ((v - domainMin) / d) * r;
};

export default function PremiumLineChart({
  data, xKey, yKey, title, height = 320, className = ''
}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 720;

  const series = useMemo(() => {
    const xs = data.map(d => String(d[xKey]));
    const ys = data.map(d => Number(d[yKey] ?? 0));
    return { xs, ys };
  }, [data, xKey, yKey]);

  const padL = 56, padR = 24, padT = 40, padB = 42;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const minY = Math.min(...series.ys, 0);
  const maxY = Math.max(...series.ys);
  const xScale = scaleLinear(0, Math.max(series.xs.length - 1, 1), padL, padL + plotW);
  const yScale = scaleLinear(minY, maxY || 1, padT + plotH, padT);

  const pathD = useMemo(() => {
    if (series.ys.length === 0) return '';
    const pts = series.ys.map((y, i) => [xScale(i), yScale(y)] as [number, number]);
    const d: string[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      if (i === 0) {
        d.push(`M ${x} ${y}`);
      } else {
        const [x0, y0] = pts[i - 1];
        const xm = (x0 + x) / 2;
        const ym = (y0 + y) / 2;
        d.push(`Q ${x0} ${y0}, ${xm} ${ym}`);
        if (i === pts.length - 1) d.push(`T ${x} ${y}`);
      }
    }
    return d.join(' ');
  }, [series.ys, xScale, yScale]);

  const gridY = useMemo(() => {
    const ticks = 4;
    const arr: number[] = [];
    for (let i = 0; i <= ticks; i++) arr.push(i / ticks);
    return arr.map(t => yScale(minY + t * (maxY - minY || 1)));
  }, [minY, maxY, yScale]);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round((x - padL) / (plotW / Math.max(series.xs.length - 1, 1)));
    if (idx >= 0 && idx < series.xs.length) setHoverIdx(idx);
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {title && <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="plc-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="100%" stopColor="#6366f1"/>
          </linearGradient>
          <linearGradient id="plc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(14,165,233,0.28)"/>
            <stop offset="100%" stopColor="rgba(99,102,241,0.00)"/>
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
            <feOffset dy="2" result="off"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.25"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="off"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g>
          {gridY.map((gy, i) => (
            <line key={i} x1={padL} x2={padL + plotW} y1={gy} y2={gy} stroke="#e5e7eb" strokeDasharray="4 4"/>
          ))}
        </g>

        <path d={`${pathD} L ${padL + plotW} ${padT + plotH} L ${padL} ${padT + plotH} Z`} fill="url(#plc-fill)" />
        <path d={pathD} stroke="url(#plc-line)" strokeWidth="3" fill="none" filter="url(#soft)" />

        <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="#cbd5e1"/>
        <line x1={padL} x2={padL + plotW} y1={padT + plotH} y2={padT + plotH} stroke="#cbd5e1"/>

        {series.xs.map((x, i) => {
          const tx = xScale(i);
          return <text key={i} x={tx} y={padT + plotH + 18} fontSize="11" textAnchor="middle" fill="#64748b">{String(x)}</text>
        })}

        {hoverIdx != null && (
          <g>
            <line x1={xScale(hoverIdx)} x2={xScale(hoverIdx)} y1={padT} y2={padT + plotH} stroke="#94a3b8" strokeDasharray="2 3"/>
            <circle cx={xScale(hoverIdx)} cy={yScale(Number(series.ys[hoverIdx]))} r={5} fill="#0ea5e9" />
          </g>
        )}
      </svg>

      {hoverIdx != null && (
        <div className="mt-2 text-xs text-slate-600">
          <span className="font-medium">{String(series.xs[hoverIdx])}</span>
          <span className="mx-2">•</span>
          <span>{yKey}: <span className="font-medium">{Number(series.ys[hoverIdx]).toLocaleString()}</span></span>
        </div>
      )}
    </div>
  );
}
