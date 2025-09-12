// pages/api/askura.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Row = { period: string; revenue: number; units: number; supplier: string; costPrice: number; staffExp: number; };
type Mode = 'line' | 'area' | 'bar' | 'scatter' | 'dual' | 'pie';
type MetricKey = 'revenue' | 'units' | 'costPrice' | 'staffExp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { question, rows, context } = req.body as {
      question: string;
      rows: Row[];
      context: { mode: Mode; yA: MetricKey; yB?: MetricKey; secondaryOn: boolean };
    };

    const apiKey = process.env.OPENAI_API_KEY;

    const totalRevenue = Array.isArray(rows) ? rows.reduce((s, r) => s + (r?.revenue ?? 0), 0) : 0;
    const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
    const last  = Array.isArray(rows) && rows.length > 0 ? rows[rows.length - 1] : undefined;
    const trend = first && last ? (last.revenue - first.revenue) : 0;

    if (!apiKey) {
      const answer = `Askura (local): total revenue ≈ ${totalRevenue}. Trend from ${first?.period ?? 'start'} to ${last?.period ?? 'end'} is ${trend >= 0 ? 'up' : 'down'} by ${Math.abs(trend)}. (Add OPENAI_API_KEY to enable AI.)`;
      return res.status(200).json({ answer });
    }

    const prompt = [
      `You are Askura, a concise data analyst.`,
      `Question: ${question}`,
      `Context: ${JSON.stringify(context)}`,
      `Data summary: rows=${Array.isArray(rows) ? rows.length : 0}, totalRevenue=${totalRevenue}, trend=${trend}`,
      `Answer clearly in 2–5 sentences. If uncertainty exists, say so.`
    ].join('\n');

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: `OpenAI error: ${text}` });
    }
    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() ?? 'No answer.';
    res.status(200).json({ answer });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Unknown error' });
  }
}
