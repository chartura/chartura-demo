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

function pct(curr: number, prev: number) {
  if (!prev) return 0;
  return ((curr - prev) / prev) * 100;
}
function computeKPIs(rows: Row[]) {
  if (!rows.length) return { totalRevenue: 0, yoyRevenue: 0, marginPctLatest: 0, bestYear: '-' };
  const totalRevenue = rows.reduce((s,r)=> s + r.revenue, 0);
  const ordered = rows.slice().sort((a,b)=> (+a.period)-(+b.period));
  const latest = ordered[ordered.length-1], prev = ordered[ordered.length-2] || ordered[ordered.length-1];
  const yoyRevenue = prev ? pct(latest.revenue, prev.revenue) : 0;
  const costL = latest.costPrice * latest.units; const staffL = latest.staffExp; const marginL = latest.revenue - costL - staffL;
  const marginPctLatest = latest.revenue ? (marginL / latest.revenue)*100 : 0;
  const bestYear = ordered.reduce((best, r)=> r.revenue > (best?.revenue ?? -Infinity) ? r : best, ordered[0]);
  return { totalRevenue, yoyRevenue, marginPctLatest, bestYear: bestYear?.period || latest.period };
}
function KPIRow({ rows, tone='light' }:{ rows: Row[]; tone?: 'light'|'dark' }){
  const { totalRevenue, yoyRevenue, marginPctLatest, bestYear } = computeKPIs(rows);
  const clsBase = "rounded-2xl px-5 py-4 shadow border";
  const tile = (label:string, value:string, hint?:string)=> (
    <div className={`${clsBase} ${tone==='dark' ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} text-center`}>
      <div className={`${tone==='dark' ? 'text-white/80' : 'text-slate-500'} text-xs`}>{label}</div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className={`${tone==='dark' ? 'text-white/70' : 'text-slate-500'} text-xs mt-0.5`}>{hint}</div>}
    </div>
  );
  const up = yoyRevenue>=0;
  const yoyStr = `${up? '▲':'▼'} ${Math.abs(Math.round(yoyRevenue))}% vs last year`;
  return (
    <div>
      <div className={`${tone==='dark' ? 'from-white/0 via-amber-300/30 to-white/0' : 'from-transparent via-amber-400/40 to-transparent'} h-px bg-gradient-to-r mb-3`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 place-items-center">
        {tile("Total revenue", "£"+ totalRevenue.toLocaleString())}
        {tile("YoY revenue", (up?'+' :'−') + Math.abs(Math.round(yoyRevenue)) + "%", yoyStr)}
        {tile("Latest margin", Math.round(marginPctLatest) + "%")}
        {tile("Best year", String(bestYear))}
      </div>
      <div className={`${tone==='dark' ? 'from-white/0 via-amber-300/30 to-white/0' : 'from-transparent via-amber-400/40 to-transparent'} h-px bg-gradient-to-r mt-3`} />
    </div>
  );
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

  function onPickFile() { gateOr(() => fileRef.current?.click()); }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErr('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    const supportedClient = ['csv', 'tsv', 'json', 'txt'];
    const willDoServer = ['xlsx','xls','pdf','docx','pptx','pages','numbers','key'];

    const readAsText = () => {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const text = String(fr.result || '');
          if (ext === 'csv' || ext === 'tsv') {
            const normalized = ext === 'tsv' ? text.replace(/\t/g, ',') : text;
            const imported = parseCsvToRows(normalized);
            if (imported.length === 0) {
              setImportErr('No rows found. Make sure your CSV/TSV has a header with: period,revenue,units,supplier,costPrice,staffExp');
            } else { setRows(imported); }
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
        } catch { setImportErr('Could not read the file. Try CSV/TSV/JSON or use Excel export.'); }
      };
      fr.readAsText(file);
    };

    if (ext && supportedClient.includes(ext)) readAsText();
    else if (ext && willDoServer.includes(ext)) setImportErr('This file type will be parsed on the server in your dashboard (trial required).');
    else setImportErr('Unsupported file type. Try CSV/TSV/JSON or Excel export.');

    e.target.value = '';
  }

  const totals = useMemo(() => {
    const sum = (k: keyof Row) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    return { revenue: sum('revenue'), units: sum('units'), staffExp: sum('staffExp') };
  }, [rows]);

  // ----- HERO (original colors) -----
  const staticRows: Row[] = [
    { period:'2020', revenue:300, units:240, supplier:'Northstar', costPrice:0.88, staffExp:40 },
    { period:'2021', revenue:350, units:260, supplier:'Northstar', costPrice:0.90, staffExp:44 },
    { period:'2022', revenue:400, units:290, supplier:'BluePeak',  costPrice:0.91, staffExp:48 },
    { period:'2023', revenue:460, units:310, supplier:'BluePeak',  costPrice:0.93, staffExp:50 },
    { period:'2024', revenue:520, units:350, supplier:'Skyline',   costPrice:0.94, staffExp:54 },
    { period:'2025', revenue:590, units:380, supplier:'Skyline',   costPrice:0.96, staffExp:58 },
  ];
  const maxU = Math.max(...staticRows.map(x=>x.units));
  const miniPts = staticRows.map((r,idx)=> [20+idx*(280/(staticRows.length-1||1)), 150 - (r.units/maxU)*110] as [number,number]);
  const miniPath = miniPts.length? `M ${miniPts[0][0]} ${miniPts[0][1]}` + miniPts.slice(1).map(p=>` L ${p[0]} ${p[1]}`).join('') : '';

  return (
    <div className="font-inter min-h-screen flex flex-col bg-white text-slate-900">
      {/* Sticky Nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-white/40">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-amber-500 to-rose-500" />
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

      {/* HERO */}
      <section className="bg-gradient-to-tr from-[#0D1F2D] via-[#1F2A44] to-[#1ABC9C] text-white px-6 md:px-24 py-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight">Turn chaos into clarity.</h1>
            <p className="mt-4 text-lg text-white/90">Upload any file — spreadsheets, slides, docs, PDFs. Get instant insights, premium charts and AI answers.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => gateOr(() => fileRef.current?.click())} className="rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 px-6 py-3 text-white font-medium shadow-lg hover:shadow-xl transition">
                Start free 7‑day trial
              </button>
              <a href="#how" className="rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-white">See how it works</a>
            </div>
          </div>
          <div>
            <div className="relative rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur shadow">
              <div className="text-white/80 text-sm mb-2">Premium Results</div>
              <svg viewBox="0 0 320 180" className="w-full h-48">
                <defs>
                  <linearGradient id="lineA" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
                  </linearGradient>
                  <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.55)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>
                {/* grid */}
                {[0,1,2,3,4].map(i=> <line key={i} x1={20} y1={30+i*30} x2={300} y2={30+i*30} stroke="rgba(255,255,255,0.15)" />)}
                {/* axes */}
                <line x1="20" y1="150" x2="300" y2="150" stroke="rgba(255,255,255,0.5)" />
                <line x1="20" y1="30" x2="20" y2="150" stroke="rgba(255,255,255,0.5)" />
                <text x="160" y="172" textAnchor="middle" fontSize="10" fill="#fff">2020 → 2025</text>
                <text x="-90" y="10" transform="rotate(-90)" fontSize="10" fill="#fff">Revenue</text>
                <path d={miniPath} fill="none" stroke="url(#lineA)" strokeWidth="3"/>
                {miniPts.map((p,idx)=>(<circle key={idx} cx={p[0]} cy={p[1]} r={3} fill="#fff"/>))}
                {/* shimmer overlay (clipped to svg) */}
                <rect x="-320" y="0" width="320" height="180" fill="url(#shimmer)">
                  <animate attributeName="x" from="-320" to="320" dur="2.8s" repeatCount="indefinite" />
                </rect>
              </svg>
            </div>
          </div>
          <div className="md:col-span-2 mt-8">
            <KPIRow rows={staticRows} tone="dark" />
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* WHY */}
        <section id="why" className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center">Why teams choose Chartura</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { title: 'Clarity first', desc: 'Readable charts, smart defaults, and typography that earns trust.' },
              { title: 'Fast to value', desc: 'Upload. Ask. Decide. No dashboards to build, no formulas to remember.' },
              { title: 'Private by design', desc: 'Your data stays yours. Control retention and exports.' },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-base font-semibold">{f.title}</div>
                <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW */}
        <section id="how" className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center">How it works</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                { title: '1. Import anything', desc: 'Excel, CSV, Google Sheets, PDFs, Word, PowerPoint — we handle it.' },
                { title: '2. Ask anything', desc: 'AI answers with context from your tables and documents.' },
                { title: '3. Share instantly', desc: 'Premium visuals ready for boardrooms — export in one click.' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-base font-semibold">{s.title}</div>
                  <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DATA (Try it) */}
        <section id="data" className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-2xl font-semibold">Try it with your data</h2>
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
                className="rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-white text-sm font-medium shadow hover:opacity-95"
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

        {/* ASKURA */}
        <section id="askura" className="px-6 py-20 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Askura — Ask Your Data</h2>
            <div className="rounded-2xl bg-white/60 backdrop-blur border border-amber-200/70 shadow-[0_10px_30px_rgba(240,180,80,0.25)] p-4">
              <div className="h-40 overflow-y-auto mb-4 space-y-2 text-sm">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                    <span className={`px-3 py-2 rounded-xl max-w-[75%] shadow-sm ${m.role==='user'? 'bg-amber-500 text-white ml-auto':'bg-white/90 border border-slate-200 text-gray-800'}`}>
                      {m.text}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 bg-white"
                  placeholder="Ask a question about the data..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
                />
                <button onClick={() => void send()} className="bg-gradient-to-r from-amber-500 to-rose-500 text-white px-4 py-2 rounded-lg hover:opacity-95">
                  Ask
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* INSIGHTS with live KPI strip */}
        <section id="insights" className="mx-auto max-w-7xl px-6 py-20">
          <h3 className="text-2xl font-semibold mb-4">Insights</h3>
          <div className="mb-6"><KPIRow rows={rows} tone="light" /></div>
          {/* Your insights tiles/cards would be here */}
        </section>

        {/* SHOWCASE */}
        <section id="showcase" className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <PremiumShowcase rows={rows} />
          </div>
        </section>

        {/* CTA BAND */}
        <section className="bg-gradient-to-r from-amber-600 to-rose-600">
          <div className="mx-auto max-w-7xl px-6 py-14 text-center text-white">
            <h3 className="text-2xl font-semibold">Turn your spreadsheets into decisions today.</h3>
            <p className="mt-2 text-amber-100">Start free — no card required for trial.</p>
            <button onClick={() => gateOr(() => fileRef.current?.click())} className="mt-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-3 font-medium shadow">
              Start free 7‑day trial
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-slate-600 flex flex-col md:flex-row items-center justify-between gap-2">
          <div>© {new Date().getFullYear()} Chartura. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:underline">Privacy</a>
            <a href="#terms" className="hover:underline">Terms</a>
            <a href="#contact" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv,.json,.txt,.xlsx,.xls,.pdf,.docx,.pptx,.pages,.numbers,.key"
        onChange={onFileChange}
        className="hidden"
      />

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
