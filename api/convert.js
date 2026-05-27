// dist/api/convert.js — Vercel/Netlify serverless function
// Proxies the conversion prompt to the Anthropic Messages API.
//
// Required env var:  ANTHROPIC_API_KEY
// Optional env vars: ANTHROPIC_MODEL (default: claude-haiku-4-5)
//                    ANTHROPIC_MAX_TOKENS (default: 1024)
//
// Deploy:  put this file at api/convert.js relative to your site root.
//          Vercel auto-detects it. For Netlify, move to netlify/functions/.

export default async function handler(req, res) {
  // CORS (only matters if the page is served from a different origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Preflight — the front-end probes for this to detect the backend.
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in environment' });
  }

  // req.body may be a string or parsed object depending on host.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const prompt = body?.prompt;
  if (typeof prompt !== 'string' || !prompt.length) {
    return res.status(400).json({ error: 'missing "prompt" string in body' });
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS || 1024);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `anthropic ${r.status}: ${text.slice(0, 240)}` });
    }
    const data = await r.json();
    const text = data?.content?.[0]?.text || '';
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'upstream call failed' });
  }
}
