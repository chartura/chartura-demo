import PremiumLineChart from '../components/premium/LineChart';
import PremiumDonutChart from '../components/premium/DonutChart';
import PremiumKpiCards from '../components/premium/KpiCards';

export interface Row {
  period: string;
  revenue: number;
  units: number;
  supplier: string;
  costPrice: number;
  staffExp: number;
}

export default function PremiumShowcase({ rows }: { rows: Row[] }) {
  const supplierMap: Record<string, number> = {};
  for (const r of rows) {
    supplierMap[r.supplier] = (supplierMap[r.supplier] ?? 0) + (r.revenue ?? 0);
  }
  const donutData = Object.entries(supplierMap).map(([label, value]) => ({ label, value }));

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-slate-900">A glimpse of your insights</h3>
        <p className="text-slate-600 text-sm">Clarity-first visuals that are presentation-ready.</p>
      </div>

      <div className="mb-6">
        <PremiumKpiCards rows={rows.map(r => ({ period: r.period, revenue: r.revenue, units: r.units }))} />
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <PremiumLineChart data={rows as any[]} xKey="period" yKey="revenue" title="Revenue over time" />
        </div>
        <div className="md:col-span-2">
          <PremiumDonutChart data={donutData} title="Supplier share (revenue)" />
        </div>
      </div>
    </section>
  );
}
