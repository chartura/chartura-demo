import React, { useState } from 'react';

// =============================================
// Chartura Homepage — Rev 18 (TS build fixes)
// =============================================

// ---------- Types & Columns ----------
interface Row {
  period: string;
  revenue: number;
  units: number;
  supplier: string;
  costPrice: number;
  staffExp: number;
}

type Mode = 'line' | 'area' | 'bar' | 'scatter' | 'dual' | 'pie';
type MetricKey = 'revenue' | 'units' | 'costPrice' | 'staffExp';

const METRIC_LABEL: Record<MetricKey, string> = {
  revenue: 'Sales (Revenue)',
  units: 'Sales Units',
  costPrice: 'Cost Price',
  staffExp: 'Staff Expenses',
};

// ---------- Demo Data (2020–2025) ----------
function defaultRows(): Row[] {
  return [
    { period: '2020', revenue: 300, units: 240, supplier: 'Northstar', costPrice: 0.88, staffExp: 40 },
    { period: '2021', revenue: 350, units: 260, supplier: 'Northstar', costPrice: 0.90, staffExp: 44 },
    { period: '2022', revenue: 400, units: 290, supplier: 'BluePeak',  costPrice: 0.91, staffExp: 48 },
    { period: '2023', revenue: 460, units: 310, supplier: 'BluePeak',  costPrice: 0.93, staffExp: 50 },
    { period: '2024', revenue: 520, units: 350, supplier: 'Skyline',   costPrice: 0.94, staffExp: 54 },
    { period: '2025', revenue: 590, units: 380, supplier: 'Skyline',   costPrice: 0.96, staffExp: 58 },
  ];
}

// ---------- Askura Memory ----------
interface AskuraMemory {
  kind: string;
  year: string;
  metric: string;
  value: number;
}

// ---------- Local Answer Logic ----------
function answerLocal(question: string, rows: Row[], mem?: AskuraMemory) {
  const text = question.toLowerCase();

  // Lowest cost price
  if (/(lowest|min).*cost|cost\s*price.*(lowest|min)/.test(text)) {
    let best: { year: string; val: number } | undefined;
    for (const r of rows) {
      if (!best || r.costPrice < best.val) best = { year: r.period, val: r.costPrice };
    }
    if (!best) return { text: 'No data.', mem };
    const newMem: AskuraMemory = { kind: 'min', metric: 'costPrice', year: best.year, value: best.val };
    return { text: `Lowest cost price: ${best.val.toFixed(2)} in ${best.year}.`, mem: newMem };
  }

  // Highest cost price
  if (/(highest|max).*cost|cost\s*price.*(highest|max)/.test(text)) {
    let best: { year: string; val: number } | undefined;
    for (const r of rows) {
      if (!best || r.costPrice > best.val) best = { year: r.period, val: r.costPrice };
    }
    if (!best) return { text: 'No data.', mem };
    const newMem: AskuraMemory = { kind: 'max', metric: 'costPrice', year: best.year, value: best.val };
    return { text: `Highest cost price: ${best.val.toFixed(2)} in ${best.year}.`, mem: newMem };
  }

  // Biggest margin
  if (/biggest\s+margin|highest\s+margin/.test(text)) {
    const byYear = new Map<string, number>();
    for (const r of rows) {
      const m = r.revenue - r.costPrice * r.units - r.staffExp;
      byYear.set(r.period, (byYear.get(r.period) || 0) + m);
    }
    const sorted = Array.from(byYear.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return { text: 'No data.', mem };
    const [year, val] = sorted[0]!;
    const newMem: AskuraMemory = { kind: 'marginMax', year, metric: 'margin', value: val };
    return { text: `Highest margin year: ${year} (~${Math.round(val)}).`, mem: newMem };
  }

  // Top supplier
  if (/which\s+supplier|top\s+supplier|most\s+(units|revenue)/.test(text)) {
    const bySup = new Map<string, { rev: number; units: number; margin: number }>();
    for (const r of rows) {
      const m = r.revenue - r.costPrice * r.units - r.staffExp;
      const s = bySup.get(r.supplier) || { rev: 0, units: 0, margin: 0 };
      s.rev += r.revenue;
      s.units += r.units;
      s.margin += m;
      bySup.set(r.supplier, s);
    }
    if (!bySup.size) return { text: 'No rows match that filter.', mem };
    const metric = /margin/.test(text) ? 'margin' : /unit/.test(text) ? 'units' : 'rev';
    const sorted = Array.from(bySup.entries()).sort(
      (a, b) => (b[1] as any)[metric] - (a[1] as any)[metric]
    );
    if (sorted.length === 0) return { text: 'No data.', mem };
    const [name, vals] = sorted[0]!;
    const val = (vals as any)[metric];
    return { text: `Top supplier by ${metric}: ${name} (${val}).`, mem };
  }

  return { text: 'Askura (demo) cannot answer that question yet.', mem };
}

// ---------- Simple Askura UI ----------
function Askura({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState('');
  const [log, setLog] = useState<{ q: string; a: string }[]>([]);
  const [mem, setMem] = useState<AskuraMemory | undefined>();

  const send = () => {
    if (!q.trim()) return;
    const { text, mem: newMem } = answerLocal(q, rows, mem);
    setMem(newMem);
    setLog(l => [...l, { q, a: text }]);
    setQ('');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow">
      <h3 className="text-lg font-semibold mb-2">Askura Q&A</h3>
      <div className="h-40 overflow-y-auto border rounded p-2 mb-2 bg-gray-50">
        {log.map((x, i) => (
          <div key={i} className="mb-2">
            <div className="font-semibold">You: {x.q}</div>
            <div className="text-gray-700">Askura: {x.a}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about the data..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button onClick={send} className="bg-emerald-600 text-white px-4 rounded">Send</button>
      </div>
    </div>
  );
}

// ---------- Page ----------
export default function HomePage() {
  const rows = defaultRows();
  return (
    <div className="font-inter p-10">
      <h1 className="text-3xl font-bold text-emerald-600 mb-6">Chartura Homepage</h1>
      <p className="mb-6 text-gray-700">Demo data and Askura assistant.</p>
      <Askura rows={rows} />
    </div>
  );
}
