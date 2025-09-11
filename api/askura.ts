import OpenAI from 'openai';

type Mode = 'line' | 'area' | 'bar' | 'scatter' | 'dual' | 'pie';
type MetricKey = 'revenue' | 'units' | 'costPrice' | 'staffExp';

interface Row {
  period: string;
  revenue: number;
  units: number;
  supplier: string;
  costPrice: number;
  staffExp: number;
}

interface AskPayload {
  question: string;
  rows: Row[];
  context?: { mode: Mode; yA: MetricKey; yB?: MetricKey; secondaryOn: boolean };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const body: AskPayload = req.body || {};
    const { question, rows, context } = body;

    if (!question || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Missing question or rows' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server missing OPENAI_API_KEY' });
    }

    const openai = new OpenAI({ apiKey });

    const system = [
      'You are Askura, a precise data analyst.',
      'Only use the provided table to answer.',
      'Be concise, numeric where possible, and reference years/suppliers clearly.',
      'If the question is ambiguous, say what extra info is needed.',
    ].join(' ');

    const user = JSON.stringify({ question, rows, context: context || null });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const answer = completion.choices?.[0]?.message?.content ?? 'No answer.';
    return res.status(200).json({ answer });
  } catch (err: any) {
    console.error('Askura API error:', err?.message || err);
    return res.status(500).json({ error: 'Askura backend error' });
  }
}

