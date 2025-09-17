// api/askura.ts
// Vercel Serverless Function (no external types). Keeps it simple and robust.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }
  try {
    const { question, rows, context } = req.body || {};

    if (!question || !Array.isArray(rows) || !context) {
      res.status(400).json({ error: 'Bad Request: missing "question", "rows", or "context".' });
      return;
    }

    // Access env safely without Node typings
    const apiKey =
      (globalThis as any)?.process?.env?.OPENAI_API_KEY ||
      (globalThis as any)?.OPENAI_API_KEY;

    if (!apiKey) {
      res.status(401).json({ error: 'OPENAI_API_KEY is not set on the server.' });
      return;
    }

    const prompt = [
      `You are Askura, a concise data analyst for a small tabular dataset.`,
      `User question: ${question}`,
      `Chart context: ${JSON.stringify(context)}`,
      `Data (first 12 rows):`,
      ...(rows || []).slice(0, 12).map((r: any) => `- ${JSON.stringify(r)}`),
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
    if (!r.ok) {
      res.status(502).json({ error: `OpenAI error (${r.status}): ${text}` });
      return;
    }

    let data: any;
    try { data = JSON.parse(text); } catch {
      res.status(502).json({ error: 'Invalid JSON from OpenAI.' });
      return;
    }

    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      res.status(502).json({ error: 'No answer from OpenAI.' });
      return;
    }

    res.status(200).json({ answer });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Unknown server error' });
  }
}
