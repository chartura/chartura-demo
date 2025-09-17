import { useState } from 'react';
import PremiumShowcase from './sections/PremiumShowcase';

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

export default function HomePage() {
  const [rows] = useState<Row[]>(defaultRows());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Know exactly what’s working — ask me anything about your data.' }
  ]);

  async function send() {
    const q = input.trim();
    if (!q) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    const ai = await askOpenAI('', q, rows, { mode: 'line', yA: 'revenue', secondaryOn: false });
    setMessages((m) => [...m, { role: 'ai', text: ai }]);
  }

  return (
    <div className="font-inter min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(14,165,233,0.12),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Confidence, not confusion.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base md:text-lg text-slate-600">
            Turn messy spreadsheets into decisions in minutes. Beautiful, presentation‑ready visuals — no design work.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a href="#askura" className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-3 text-white font-medium shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 transition">
              Try Askura
            </a>
            <a href="#showcase" className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium hover:shadow-md transition">
              See how it looks
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
    </div>
  );
}
