export default function SpreadsheetToDecision() {
  // helper to draw a cell
  const cell = (x:number,y:number,w=96,h=30,fill='#fff',stroke='#e5e7eb',text?:string, cls='') => (
    <g className={cls}>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} rx={4}/>
      {text && <text x={x+10} y={y+19} fontSize="12" fill="#334155">{text}</text>}
    </g>
  );

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl ring-1 ring-white/10 backdrop-blur">
      <svg viewBox="0 0 1280 520" className="w-full h-auto">
        <defs>
          <linearGradient id="mess" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
          <linearGradient id="clean" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#6366f1"/>
          </linearGradient>
          <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="b"/>
            <feOffset dy="2" in="b" result="o"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.22"/></feComponentTransfer>
            <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Left: messy spreadsheet */}
        <g transform="translate(20,28)">
          <rect x="0" y="0" width="480" height="464" rx="16" fill="url(#mess)" opacity="0.12" />
          <rect x="8" y="8" width="464" height="448" rx="14" fill="#fff" stroke="#e5e7eb" filter="url(#s)"/>
          {/* headers */}
          {cell(18, 26, 140, 34, '#f8fafc', '#e2e8f0', 'Period')}
          {cell(158,26, 140, 34, '#f8fafc', '#e2e8f0', 'Revenue?')}
          {cell(298,26, 140, 34, '#f8fafc', '#e2e8f0', 'Units/Qty')}
          {/* messy rows */}
          {cell(18, 60, 140, 34, '#fff', '#fee2e2', '2020')}
          {cell(158,60,140, 34, '#fff', '#fee2e2', '$ 300')}
          {cell(298,60,140, 34, '#fff', '#fee2e2', '—')}

          {cell(18, 94, 140, 34, '#fff', '#fde68a', 'FY21')}
          {cell(158,94,140, 34, '#fff', '#fde68a', '350.00?')}
          {cell(298,94,140, 34, '#fff', '#fde68a', 'two‑sixty')}

          {cell(18, 128, 140, 34, '#fff', '#fbcfe8', '2022 ')}
          {cell(158,128,140,34, '#fff', '#fbcfe8', '≈ 400')}
          {cell(298,128,140,34, '#fff', '#fbcfe8', '290')}

          <text x="18" y="178" fontSize="12" fill="#ef4444">• Inconsistent headers</text>
          <text x="18" y="198" fontSize="12" fill="#eab308">• Mixed formats</text>
          <text x="18" y="218" fontSize="12" fill="#db2777">• Missing values</text>
        </g>

        {/* Middle: pipeline pill */}
        <g transform="translate(528,200)">
          <rect x="0" y="0" width="224" height="120" rx="60" fill="#0b1220" opacity="0.96"/>
          <text x="112" y="52" textAnchor="middle" fontSize="14" fill="#e5e7eb">Clean • Normalize</text>
          <text x="112" y="74" textAnchor="middle" fontSize="14" fill="#e5e7eb">Understand • Answer</text>
        </g>

        {/* Right: clean insights */}
        <g transform="translate(776,28)">
          <rect x="0" y="0" width="484" height="464" rx="16" fill="url(#clean)" opacity="0.14" />
          <rect x="8" y="8" width="468" height="448" rx="14" fill="#fff" stroke="#e5e7eb" filter="url(#s)"/>

          {/* KPI cards */}
          <g transform="translate(18,18)">
            <rect x="0" y="0" width="220" height="72" rx="14" fill="#fff" stroke="#e5e7eb"/>
            <text x="14" y="26" fontSize="12" fill="#64748b">Total Revenue</text>
            <text x="14" y="52" fontSize="18" fontWeight="600" fill="#0f172a">$2.62m</text>

            <rect x="244" y="0" width="220" height="72" rx="14" fill="#fff" stroke="#e5e7eb"/>
            <text x="258" y="26" fontSize="12" fill="#64748b">Best Year</text>
            <text x="258" y="52" fontSize="18" fontWeight="600" fill="#0f172a">2025</text>
          </g>

          {/* Line chart stub */}
          <g transform="translate(18, 108)">
            <rect x="0" y="0" width="446" height="182" rx="14" fill="#fff" stroke="#e5e7eb"/>
            <text x="12" y="20" fontSize="12" fill="#64748b">Revenue over time</text>
            <path d="M16,148 Q96,96 176,106 T336,60 T430,86" stroke="url(#clean)" strokeWidth="3" fill="none"/>
            <path d="M16,148 L430,148 L430,168 L16,168Z" fill="url(#clean)" opacity="0.16"/>
          </g>

          {/* Bullets */}
          <g transform="translate(18, 304)">
            <text x="0" y="0" fontSize="12" fill="#0f172a">• Instant KPIs and trends</text>
            <text x="0" y="22" fontSize="12" fill="#0f172a">• Ask a question — get a direct answer</text>
            <text x="0" y="44" fontSize="12" fill="#0f172a">• Export presentation‑ready visuals</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
