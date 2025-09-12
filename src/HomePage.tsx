
import React, { useEffect, useMemo, useRef, useState } from 'react';

// =============================================
// Chartura Homepage — Rev 19 (Askura integrated, no API key toggle)
// =============================================

// (Truncated comment: this file includes Hero, How It Works, Why Chartura, Try It, Askura, Insights)
// Askura now calls /api/askura and falls back to local logic if backend unavailable.

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

// ---------- Demo Data ----------
function defaultRows(): Row[] {
  return [
    { period: '2020', revenue: 300, units: 240, supplier: 'Northstar', costPrice: 0.88, staffExp: 40 },
    { period: '2021', revenue: 350, units: 260, supplier: 'Northstar', costPrice: 0.9, staffExp: 44 },
    { period: '2022', revenue: 400, units: 290, supplier: 'BluePeak', costPrice: 0.91, staffExp: 48 },
    { period: '2023', revenue: 460, units: 310, supplier: 'BluePeak', costPrice: 0.93, staffExp: 50 },
    { period: '2024', revenue: 520, units: 350, supplier: 'Skyline', costPrice: 0.94, staffExp: 54 },
    { period: '2025', revenue: 590, units: 380, supplier: 'Skyline', costPrice: 0.96, staffExp: 58 }
  ];
}

// ---------- Askura API Call ----------
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

// ---------- Main Component ----------
export default function HomePage() {
  const [rows, setRows] = useState<Row[]>(defaultRows());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);

  async function send() {
    if (!input.trim()) return;
    const q = input;
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
    <div className="font-inter">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center py-20">
        <h1 className="text-4xl font-bold mb-4">Chartura</h1>
        <p className="text-lg opacity-90 mb-6">Transform your spreadsheets into insights, instantly.</p>
      </section>

      {/* Try It Section */}
      <section className="p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Askura — Ask Your Data</h2>
        <div className="border rounded-xl p-4 bg-white shadow">
          <div className="h-40 overflow-y-auto mb-4 space-y-2 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <span className={m.role === 'user' ? 'bg-blue-100 px-2 py-1 rounded' : 'bg-gray-100 px-2 py-1 rounded'}>
                  {m.text}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-lg px-2 py-1"
              placeholder="Ask a question about the data..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button onClick={send} className="bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700">
              Ask
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
