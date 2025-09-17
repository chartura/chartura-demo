type Row = { period: string; revenue: number; units: number };

function pct(a: number, b: number) {
  if (!Number.isFinite(a) || a === 0) return 0;
  return ((b - a) / a) * 100;
}

export default function PremiumKpiCards({ rows }: { rows: Row[] }) {
  const totalRev = rows.reduce((s, r) => s + (r.revenue || 0), 0);
  const first = rows[0], last = rows[rows.length - 1];
  let bestYear = rows[0]?.period ?? '';
  let bestVal = rows[0]?.revenue ?? -Infinity;
  for (const r of rows) {
    if ((r.revenue ?? -Infinity) > bestVal) { bestVal = r.revenue; bestYear = r.period; }
  }
  const growthPct = pct(first?.revenue ?? 0, last?.revenue ?? 0);

  const cards = [
    { label: 'Total Revenue', value: totalRev.toLocaleString(), hint: 'sum of all periods' },
    { label: 'Best Year', value: String(bestYear), hint: 'by revenue' },
    { label: 'Growth', value: `${growthPct.toFixed(1)}%`, hint: 'first → last' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">{c.label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{c.value}</div>
          <div className="text-xs text-slate-500 mt-1">{c.hint}</div>
        </div>
      ))}
    </div>
  );
}
