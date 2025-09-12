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
    if (!apiKey) {
      // STRICT: No local fallbacks — fail fast so the UI shows it's misconfigured
      return res.status(401).json({ error: 'OPENAI_API_KEY is not set on the server.' });
    }

    const prompt = [
      `You are Askura, a concise data analyst that answers questions about a small tabular dataset.`,
      `User question: ${question}`,
      `Chart context: ${JSON.stringify(context)}`,
      `Data (first 12 rows):`,
      ...(Array.isArray(rows) ? rows.slice(0,12).map(r => `- ${JSON.stringify(r)}`) : ['- none']),
      `Instructions: Provide a direct answer in 1–2 sentences. Include one brief numeric fact if helpful. Be clear and specific.`
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
      return res.status(502).json({ error: `OpenAI error: ${text}` });
    }
    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ error: 'No answer from OpenAI.' });
    res.status(200).json({ answer });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Unknown error' });
  }
}
