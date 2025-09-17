import { useMemo, useRef, useState } from 'react';
import PremiumShowcase from './sections/PremiumShowcase';
import TrialModal from './components/TrialModal';

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

function defaultRows(): Row[] {
  return [
    { period: '2020', revenue: 300, units: 240, supplier: 'Northstar', costPrice: 0.88, staffExp: 40 },
    { period: '2021', revenue: 350, units: 260, supplier: 'Northstar', costPrice: 0.9,  staffExp: 44 },
    { period: '2022', revenue: 400, units: 290, supplier: 'BluePeak',  costPrice: 0.91, staffExp: 48 },
    { period: '2023', revenue: 460, units: 310, supplier: 'BluePeak',  costPrice: 0.93, staffExp: 50 },
    { period: '2024', revenue: 520, units: 350, supplier: 'Skyline',   costPrice: 0.94, staffExp: 54 },
    { period: '2025', revenue: 590, units: 380, supplier: 'Skyline',   costPrice: 0.96, staffExp: 58 }
  ];
}

async function askOpenAI(
  _apiKey: string,
  prompt: string,
  rows: Row[],
  context: { mode: Mode; yA: MetricKey; yB?: MetricKey; secondaryOn: boolean }
): Promise<string> {
  try {
    const res = await fetch('/api/askura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: prompt, rows, context })
    });
    if (!res.ok) {
      let msg = 'API error';
      try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
      return `Askura error: ${msg}`;
    }
    const data = await res.json();
    return typeof data?.answer === 'string' ? data.answer : 'Askura error: No answer in response.';
  } catch {
    return 'Askura error: Network or server unreachable.';
  }
}

// --- CSV Import (no deps) ---
function parseCsvToRows(csv: string): Row[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const iPeriod = idx('period');
  const iRevenue = idx('revenue');
  const iUnits = idx('units');
  const iSupplier = idx('supplier');
  const iCost = idx('costprice');
  const iStaff = idx('staffexp');

  const rows: Row[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = lines[li].split(',').map(c => c.trim());
    if (!cols.length) continue;
    rows.push({
      period: String(cols[iPeriod] ?? ''),
      revenue: Number(cols[iRevenue] ?? 0),
      units: Number(cols[iUnits] ?? 0),
      supplier: String(cols[iSupplier] ?? ''),
      costPrice: Number(cols[iCost] ?? 0),
      staffExp: Number(cols[iStaff] ?? 0),
    });
  }
  return rows.filter(r => r.period);
}

export default function HomePage() {
  const [rows, setRows] = useState<Row[]>(defaultRows());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Know exactly what’s working — ask me anything about your data.' }
  ]);
  const [showTrial, setShowTrial] = useState(false);
  const [trialActive, setTrialActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('trialActive') === 'true';
  });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importErr, setImportErr] = useState<string>('');

  function gateOr(fn: () => void) {
    if (trialActive) return fn();
    setShowTrial(true);
  }

  function startTrial() {
    setTrialActive(true);
    if (typeof window !== 'undefined') localStorage.setItem('trialActive', 'true');
    setShowTrial(false);
    // auto open file picker after enabling trial
    setTimeout(() => fileRef.current?.click(), 50);
  }

  async function send() {
    const q = input.trim();
    if (!q) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    const ai = await askOpenAI('', q, rows, { mode: 'line', yA: 'revenue', secondaryOn: false });
    setMessages((m) => [...m, { role: 'ai', text: ai }]);
  }

  function onPickFile() {
    gateOr(() => fileRef.current?.click());
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErr('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    const supportedClient = ['csv', 'tsv', 'json', 'txt'];
    const willDoServer = ['xlsx','xls','pdf','docx','pptx','pages','numbers','key'];

    if (ext && supportedClient.includes(ext)) {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const text = String(fr.result || '');
          if (ext === 'csv' || ext === 'tsv') {
            const normalized = ext === 'tsv' ? text.replace(/\t/g, ',') : text;
            const imported = parseCsvToRows(normalized);
            if (imported.length === 0) {
              setImportErr('No rows found. Make sure your CSV/TSV has a header with: period,revenue,units,supplier,costPrice,staffExp');
            } else {
              setRows(imported);
            }
          } else if (ext === 'json') {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) setRows(parsed as Row[]);
            else setImportErr('JSON must be an array of objects with the expected columns.');
          } else if (ext === 'txt') {
            const lines = text.split(/\r?\n/).filter(Boolean);
            const imported: Row[] = lines.map((line, i) => {
              const nums = line.split(/[,\s]+/).map(n => Number(n));
              return { period: String(i + 1), revenue: nums[0] || 0, units: nums[1] || 0, supplier: 'Unknown', costPrice: 0, staffExp: 0 };
            });
            setRows(imported);
          }
        } catch (err: any) {
          setImportErr('Could not read the file. Try CSV/TSV/JSON or use Excel export.');
        }
      };
      fr.readAsText(file);
    } else if (ext && willDoServer.includes(ext)) {
      setImportErr('This file type will be parsed on the server in your dashboard (trial required).');
    } else {
      setImportErr('Unsupported file type. Try CSV/TSV/JSON or Excel export.');
    }

    e.target.value = '';
  }

  // Compute table totals
  const totals = useMemo(() => {
    const sum = (k: keyof Row) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    return { revenue: sum('revenue'), units: sum('units'), staffExp: sum('staffExp') };
  }, [rows]);

  return (
    <div className="font-inter min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      {/* Sticky Nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-white/40">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500" />
            <span className="font-semibold tracking-tight">Chartura</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a className="opacity-70 hover:opacity-100 transition" href="#why">Why</a>
            <a className="opacity-70 hover:opacity-100 transition" href="#how">How</a>
            <a className="opacity-70 hover:opacity-100 transition" href="#askura">Askura</a>
            <a className="opacity-70 hover:opacity-100 transition" href="#showcase">Showcase</a>
          </nav>
          <button onClick={() => gateOr(() => fileRef.current?.click())} className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-medium shadow-sm hover:shadow transition">
            Start free trial
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(14,165,233,0.12),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Confidence, not confusion.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base md:text-lg text-slate-600">
            Turn messy spreadsheets into decisions in minutes. Import any file. Get instant insights, premium charts and AI answers.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => gateOr(() => fileRef.current?.click())} className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-3 text-white font-medium shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 transition">
              Start free 7‑day trial
            </button>
            <a href="#how" className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium hover:shadow-md transition">
              See how it works
            </a>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-sm">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <div className="font-semibold">60s</div>
              <div className="opacity-70">to first insight</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <div className="font-semibold">No code</div>
              <div className="opacity-70">just your data</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <div className="font-semibold">Secure</div>
              <div className="opacity-70">you control access</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <div className="font-semibold">Export</div>
              <div className="opacity-70">PNG & PDF ready</div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* Why */}
        <section id="why" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center">Why Chartura</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              { title: 'Clarity first', desc: 'Readable charts, smart defaults, beautiful typography.' },
              { title: 'Fast to value', desc: 'Upload. Ask. Decide. No dashboards to build.' },
              { title: 'Private by design', desc: 'Your keys, your storage, your control.' },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                <div className="text-base font-semibold">{f.title}</div>
                <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How */}
        <section id="how" className="mx-auto max-w-6xl px-4 py-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center">How it works</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              { title: '1. Import anything', desc: 'Excel, CSV, Google Sheets, PDFs, Word, PowerPoint — we handle it.' },
              { title: '2. Ask anything', desc: 'AI answers with context from your tables and documents.' },
              { title: '3. Share instantly', desc: 'Premium visuals ready for boardrooms — export in one click.' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                <div className="text-base font-semibold">{s.title}</div>
                <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data import + table */}
        <section id="data" className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-xl font-semibold">Your data</h2>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.json,.txt,.xlsx,.xls,.pdf,.docx,.pptx,.pages,.numbers,.key"
                onChange={onFileChange}
                className="hidden"
              />
              <button
                onClick={onPickFile}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-white text-sm font-medium shadow hover:opacity-95"
              >
                Import file
              </button>
            </div>
          </div>
          {importErr && <div className="text-sm text-rose-600 mb-2">{importErr}</div>}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">Revenue</th>
                  <th className="px-4 py-2">Units</th>
                  <th className="px-4 py-2">Supplier</th>
                  <th className="px-4 py-2">Cost Price</th>
                  <th className="px-4 py-2">Staff Exp</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={i % 2 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-2">{r.period}</td>
                    <td className="px-4 py-2">{r.revenue.toLocaleString()}</td>
                    <td className="px-4 py-2">{r.units.toLocaleString()}</td>
                    <td className="px-4 py-2">{r.supplier}</td>
                    <td className="px-4 py-2">{r.costPrice}</td>
                    <td className="px-4 py-2">{r.staffExp.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr className="font-medium">
                  <td className="px-4 py-2">Totals</td>
                  <td className="px-4 py-2">{totals.revenue.toLocaleString()}</td>
                  <td className="px-4 py-2">{totals.units.toLocaleString()}</td>
                  <td className="px-4 py-2">—</td>
                  <td className="px-4 py-2">—</td>
                  <td className="px-4 py-2">{totals.staffExp.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Askura chat */}
        <section id="askura" className="p-6 max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Askura — Ask Your Data</h2>
          <div className="border rounded-2xl p-4 bg-white shadow-sm">
            <div className="h-40 overflow-y-auto mb-4 space-y-2 text-sm">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                  <span className={m.role === 'user' ? 'bg-cyan-50 px-2 py-1 rounded' : 'bg-gray-100 px-2 py-1 rounded'}>
                    {m.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 bg-white"
                placeholder="Ask a question about the data..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
              />
              <button onClick={() => void send()} className="bg-gradient-to-r from-cyan-500 to-indigo-500 text-white px-4 py-2 rounded-lg hover:opacity-95">
                Ask
              </button>
            </div>
          </div>
        </section>

        {/* Premium Showcase */}
        <div id="showcase">
          <PremiumShowcase rows={rows} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600 flex flex-col md:flex-row items-center justify-between gap-2">
          <div>© {new Date().getFullYear()} Chartura. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:underline">Privacy</a>
            <a href="#terms" className="hover:underline">Terms</a>
            <a href="#contact" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>

      {/* Trial modal */}
      <TrialModal
        open={showTrial}
        onClose={() => setShowTrial(false)}
        onStartTrial={startTrial}
        onUseDemo={() => setShowTrial(false)}
      />
    </div>
  );
}
