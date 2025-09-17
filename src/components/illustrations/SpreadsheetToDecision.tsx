export default function SpreadsheetToDecision() {
  const cell = (x:number,y:number,w=80,h=28,fill='#fff',stroke='#e5e7eb',text?:string, cls='') => (
    <g className={cls}>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke}/>
      {text && <text x={x+8} y={y+18} fontSize="11" fill="#334155">{text}</text>}
    </g>
  );
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <svg viewBox="0 0 960 300" className="w-full h-auto">
        {/* Left: Messy sheet */}
        <defs>
          <linearGradient id="mess" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fda4af"/>
            <stop offset="100%" stopColor="#fde68a"/>
          </linearGradient>
          <linearGradient id="clean" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#6366f1"/>
          </linearGradient>
        </defs>

        <g transform="translate(10,20)">
          <rect x="0" y="0" width="340" height="260" rx="12" fill="url(#mess)" opacity="0.12" />
          <rect x="6" y="6" width="328" height="248" rx="10" fill="#fff" stroke="#e5e7eb"/>
          {/* headers */}
          {cell(14, 18, 90, 26, '#f8fafc', '#e2e8f0', 'Period')}
          {cell(104, 18, 90, 26, '#f8fafc', '#e2e8f0', 'Revenue?')}
          {cell(194, 18, 90, 26, '#f8fafc', '#e2e8f0', 'Units/Qty')}
          {cell(284, 18, 40, 26, '#f8fafc', '#e2e8f0', '...')}
          {/* messy rows */}
          {cell(14, 44, 90, 26, '#fff', '#fee2e2', '2020')}
          {cell(104,44, 90, 26, '#fff', '#fee2e2', '$ 300')}
          {cell(194,44, 90, 26, '#fff', '#fee2e2', '—')}
          {cell(14, 70, 90, 26, '#fff', '#fde68a', 'FY21')}
          {cell(104,70, 90, 26, '#fff', '#fde68a', '350.00?')}
          {cell(194,70, 90, 26, '#fff', '#fde68a', 'two‑sixty')}
          {cell(14, 96, 90, 26, '#fff', '#fbcfe8', '2022 ')}
          {cell(104,96, 90, 26, '#fff', '#fbcfe8', '≈ 400')}
          {cell(194,96, 90, 26, '#fff', '#fbcfe8', '290')}
          {/* notes */}
          <text x="14" y="136" fontSize="11" fill="#ef4444">• Inconsistent headers</text>
          <text x="14" y="154" fontSize="11" fill="#eab308">• Mixed formats</text>
          <text x="14" y="172" fontSize="11" fill="#db2777">• Missing values</text>
        </g>

        {/* Arrow */}
        <g transform="translate(360,110)">
          <rect x="0" y="0" width="240" height="80" rx="40" fill="#111827" opacity="0.92"/>
          <text x="120" y="48" textAnchor="middle" fontSize="13" fill="#e5e7eb">Clean • Normalize • Understand</text>
        </g>

        {/* Right: Clean insights */}
        <g transform="translate(620,20)">
          <rect x="0" y="0" width="330" height="260" rx="12" fill="url(#clean)" opacity="0.14" />
          <rect x="6" y="6" width="318" height="248" rx="10" fill="#fff" stroke="#e5e7eb"/>
          {/* KPI cards */}
          <rect x="16" y="16" width="130" height="52" rx="12" fill="#fff" stroke="#e5e7eb"/>
          <text x="28" y="38" fontSize="11" fill="#64748b">Total Revenue</text>
          <text x="28" y="56" fontSize="16" fontWeight="600" fill="#0f172a">$2.6m</text>

          <rect x="170" y="16" width="130" height="52" rx="12" fill="#fff" stroke="#e5e7eb"/>
          <text x="182" y="38" fontSize="11" fill="#64748b">Best Year</text>
          <text x="182" y="56" fontSize="16" fontWeight="600" fill="#0f172a">2025</text>

          {/* Line chart stub */}
          <g transform="translate(16, 84)">
            <rect x="0" y="0" width="284" height="140" rx="12" fill="#fff" stroke="#e5e7eb"/>
            <path d="M8,120 Q60,80 112,92 T216,50 T276,70" stroke="url(#clean)" strokeWidth="3" fill="none"/>
            <path d="M8,120 L276,120 L276,140 L8,140Z" fill="url(#clean)" opacity="0.16"/>
            <text x="10" y="18" fontSize="11" fill="#64748b">Revenue over time</text>
          </g>
        </g>
      </svg>
    </div>
  );
}