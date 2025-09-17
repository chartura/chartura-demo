// pages/api/askura.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Row = { period: string; revenue: number; units: number; supplier: string; costPrice: number; staffExp: number; };
type Mode = 'line' | 'area' | 'bar' | 'scatter' | 'dual' | 'pie';
type MetricKey = 'revenue' | 'units' | 'costPrice' | 'staffExp';

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  try {
    const { question, rows, context } = req.body as {
      question?: string;
      rows?: Row[];
      context?: { mode: Mode; yA: MetricKey; yB?: MetricKey; secondaryOn: boolean };
    };

    if (!question || !Array.isArray(rows) || !context) {
      return res.status(400).json({ error: 'Bad Request: missing "question", "rows", or "context".' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(401).json({ error: 'OPENAI_API_KEY is not set on the server.' });

    const prompt = [
      `You are Askura, a concise data analyst for a small tabular dataset.`,
      `User question: ${question}`,
      `Chart context: ${JSON.stringify(context)}`,
      `Data (first 12 rows):`,
      ...rows.slice(0, 12).map(r => `- ${JSON.stringify(r)}`),
      `Instructions: Provide a direct answer in 1–2 sentences. Include one numeric fact if helpful.`
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

    const text = await r.text();
    if (!r.ok) return res.status(502).json({ error: `OpenAI error (${r.status}): ${text}` });

    let data: any;
    try { data = JSON.parse(text); } catch { return res.status(502).json({ error: 'Invalid JSON from OpenAI.' }); }

    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ error: 'No answer from OpenAI.' });

    return res.status(200).json({ answer });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unknown server error' });
  }
}
