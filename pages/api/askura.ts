// pages/api/askura.ts
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Askura API (Pages Router, Node.js runtime)
 * - OpenAI-only (no local fallbacks)
 * - Clear JSON errors for easy debugging
 * - Small body size limit via Next config (below)
 */

type Row = { period: string; revenue: number; units: number; supplier: string; costPrice: number; staffExp: number; };
type Mode = 'line' | 'area' | 'bar' | 'scatter' | 'dual' | 'pie';
type MetricKey = 'revenue' | 'units' | 'costPrice' | 'staffExp';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

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
    if (!apiKey) {
      return res.status(401).json({ error: 'OPENAI_API_KEY is not set on the server.' });
    }

    const prompt = [
      `You are Askura, a concise data analyst for small tabular datasets.`,
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

    if (!r.ok) {
      const text = await r.text();
      console.error('OpenAI HTTP error', r.status, text);
      return res.status(502).json({ error: `OpenAI error (${r.status}): ${text}` });
    }

    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      console.error('OpenAI empty answer', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'No answer from OpenAI.' });
    }

    return res.status(200).json({ answer });
  } catch (e: any) {
    console.error('Askura handler exception', e);
    return res.status(500).json({ error: e?.message || 'Unknown server error' });
  }
}
