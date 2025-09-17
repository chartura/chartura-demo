export default function SpreadsheetToDecision() {
  const cell = (x:number,y:number,w=110,h=36,fill='#fff',stroke='#e5e7eb',text?:string, cls='') => (
    <g className={cls}>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} rx={6}/>
      {text && <text x={x+12} y={y+22} fontSize="13" fill="#334155">{text}</text>}
    </g>
  );

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur">
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
            <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="b"/>
            <feOffset dy="2" in="b" result="o"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.22"/></feComponentTransfer>
            <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Left: messy spreadsheet */}
        <g transform="translate(24,28)">
          <rect x="0" y="0" width="500" height="464" rx="18" fill="url(#mess)" opacity="0.12" />
          <rect x="8" y="8" width="484" height="448" rx="16" fill="#fff" stroke="#e5e7eb" filter="url(#s)"/>
          {/* headers */}
          {cell(24, 28, 160, 38, '#f8fafc', '#e2e8f0', 'Period')}
          {cell(184,28, 160, 38, '#f8fafc', '#e2e8f0', 'Revenue?')}
          {cell(344,28, 136, 38, '#f8fafc', '#e2e8f0', 'Units/Qty')}
          {/* messy rows */}
          {cell(24, 66, 160, 38, '#fff', '#fee2e2', '2020')}
          {cell(184,66,160, 38, '#fff', '#fee2e2', '$ 300')}
          {cell(344,66,136, 38, '#fff', '#fee2e2', '—')}

          {cell(24, 104, 160, 38, '#fff', '#fde68a', 'FY21')}
          {cell(184,104,160, 38, '#fff', '#fde68a', '350.00?')}
          {cell(344,104,136, 38, '#fff', '#fde68a', 'two‑sixty')}

          {cell(24, 142, 160, 38, '#fff', '#fbcfe8', '2022 ')}
          {cell(184,142,160,38, '#fff', '#fbcfe8', '≈ 400')}
          {cell(344,142,136,38, '#fff', '#fbcfe8', '290')}

          <text x="24" y="196" fontSize="13" fill="#ef4444">• Inconsistent headers</text>
          <text x="24" y="220" fontSize="13" fill="#eab308">• Mixed formats</text>
          <text x="24" y="244" fontSize="13" fill="#db2777">• Missing values</text>
        </g>

        {/* Middle: pipeline pill */}
        <g transform="translate(552,196)">
          <rect x="0" y="0" width="220" height="128" rx="64" fill="#0b1220" opacity="0.96"/>
          <text x="110" y="55" textAnchor="middle" fontSize="15" fill="#e5e7eb">Clean • Normalize</text>
          <text x="110" y="78" textAnchor="middle" fontSize="15" fill="#e5e7eb">Understand • Answer</text>
        </g>

        {/* Right: clean insights */}
        <g transform="translate(800,28)">
          <rect x="0" y="0" width="472" height="464" rx="18" fill="url(#clean)" opacity="0.14" />
          <rect x="8" y="8" width="456" height="448" rx="16" fill="#fff" stroke="#e5e7eb" filter="url(#s)"/>

          {/* KPI cards */}
          <g transform="translate(20,18)">
            <rect x="0" y="0" width="212" height="76" rx="14" fill="#fff" stroke="#e5e7eb"/>
            <text x="14" y="28" fontSize="12" fill="#64748b">Total Revenue</text>
            <text x="14" y="54" fontSize="20" fontWeight="600" fill="#0f172a">$2.62m</text>

            <rect x="224" y="0" width="212" height="76" rx="14" fill="#fff" stroke="#e5e7eb"/>
            <text x="238" y="28" fontSize="12" fill="#64748b">Best Year</text>
            <text x="238" y="54" fontSize="20" fontWeight="600" fill="#0f172a">2025</text>
          </g>

          {/* Line chart stub */}
          <g transform="translate(20, 112)">
            <rect x="0" y="0" width="436" height="188" rx="14" fill="#fff" stroke="#e5e7eb"/>
            <text x="12" y="22" fontSize="12" fill="#64748b">Revenue over time</text>
            <path d="M16,152 Q96,96 176,110 T336,64 T430,92" stroke="url(#clean)" strokeWidth="3" fill="none"/>
            <path d="M16,152 L430,152 L430,172 L16,172Z" fill="url(#clean)" opacity="0.16"/>
          </g>

          {/* Bullets */}
          <g transform="translate(20, 314)">
            <text x="0" y="0" fontSize="13" fill="#0f172a">• Instant KPIs and trends</text>
            <text x="0" y="26" fontSize="13" fill="#0f172a">• Ask a question — get a direct answer</text>
            <text x="0" y="52" fontSize="13" fill="#0f172a">• Export presentation‑ready visuals</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
