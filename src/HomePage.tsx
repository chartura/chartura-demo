import { useState } from 'react';

// =============================================
// Chartura Homepage — Rev 20 (build fixes + premium polish)
// =============================================
// Changes:
// - Removed unused imports (React, useEffect, useMemo, useRef) to fix TS6133 warnings.
// - Removed unused state setter (setRows) to fix TS6133 warning.
// - Light visual polish: premium gradient hero, subtle glass card, refined typography,
//   simple top nav, footer, and microcopy adjustments. No new deps required.
// - Preserved Askura chat and defaultRows() demo data.
//
// Types
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

// Demo Data
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

// Askura API Call
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
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.answer || 'No answer.';
  } catch {
    return 'Askura server unavailable.';
  }
}

// Main Component
export default function HomePage() {
  // Only the value is used; removing the setter fixes TS6133.
  const [rows] = useState<Row[]>(defaultRows());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hi! Ask me anything about the sample data below (e.g., "What’s the revenue trend?").' }
  ]);

  async function send() {
    if (!input.trim()) return;
    const q = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);

    const ai = await askOpenAI('', q, rows, { mode: 'line', yA: 'revenue', secondaryOn: false });
    if (ai !== 'Askura server unavailable.') {
      setMessages((m) => [...m, { role: 'ai', text: ai }]);
    } else {
      setMessages((m) => [...m, { role: 'ai', text: 'Local fallback: feature unavailable in sandbox.' }]);
    }
  }

  return (
    <div className="font-inter min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-white/40">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600"></div>
            <span className="font-semibold tracking-tight">Chartura</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a className="opacity-70 hover:opacity-100 transition" href="#how">How it works</a>
            <a className="opacity-70 hover:opacity-100 transition" href="#why">Why Chartura</a>
            <a className="opacity-70 hover:opacity-100 transition" href="#askura">Askura</a>
          </nav>
          <a
            href="#try"
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-medium shadow-sm hover:shadow transition"
          >
            Try it
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(37,99,235,0.12),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
            Turn spreadsheets into <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">beautiful insights</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-slate-600">
            Upload CSV, Excel, or other tabular data and get instant, presentation‑ready charts and answers.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a
              href="#try"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white font-medium shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition"
            >
              Try Askura
            </a>
            <a
              href="#how"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium hover:shadow-md transition"
            >
              See how it works
            </a>
          </div>

          {/* Trust/Stats */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-sm">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <div className="font-semibold">60s</div>
              <div className="opacity-70">to first chart</div>
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

      {/* How It Works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">How it works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            { title: '1. Import', desc: 'Upload CSV or Excel. We\'ll auto-detect headers and types.' },
            { title: '2. Explore', desc: 'Ask natural-language questions with Askura to surface trends.' },
            { title: '3. Visualise', desc: 'Generate line, bar, pie, and more — then export in one click.' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              <div className="text-base font-semibold">{s.title}</div>
              <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Chartura */}
      <section id="why" className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-10 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Why Chartura</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            {[
              { title: 'Clarity first', desc: 'We favour readable charts with sensible defaults and typography.' },
              { title: 'Fast & friendly', desc: 'Short path to answers with clean UI and smart suggestions.' },
              { title: 'Private by design', desc: 'Your data stays yours. Bring your own storage and keys.' },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                <div className="text-base font-semibold">{f.title}</div>
                <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Askura — Ask Your Data */}
      <section id="askura" className="px-4 py-16">
        <div id="try" className="mx-auto max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Askura — Ask your data</h2>
          <p className="mt-2 text-slate-600 text-sm md:text-base">
            Try a question like: <span className="font-medium">“What’s the revenue CAGR from 2020 to 2025?”</span>
          </p>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm">
            <div className="h-48 overflow-y-auto rounded-xl bg-slate-50/70 p-4 text-sm space-y-2 border border-slate-200">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                  <span
                    className={
                      m.role === 'user'
                        ? 'inline-block max-w-[85%] bg-blue-50 px-3 py-2 rounded-xl shadow-sm'
                        : 'inline-block max-w-[85%] bg-slate-100 px-3 py-2 rounded-xl shadow-sm'
                    }
                  >
                    {m.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 bg-white"
                placeholder="Ask a question about the data..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              />
              <button
                onClick={send}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-white text-sm font-medium shadow hover:shadow-md active:translate-y-[1px] transition"
              >
                Ask
              </button>
            </div>
          </div>

          {/* Sample data preview (static for trust) */}
          <div className="mt-6 text-xs text-slate-500">
            <span className="font-medium">Sample rows:</span> 2020–2025 revenue & units by supplier with cost & staff expenses.
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600 flex flex-col md:flex-row items-center justify-between gap-2">
          <div>&copy; {new Date().getFullYear()} Chartura. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:underline">Privacy</a>
            <a href="#terms" className="hover:underline">Terms</a>
            <a href="#contact" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
