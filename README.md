# pdf2md — built site

This folder contains the **publishable build** of pdf2md. Three self-contained HTML files, no external assets required.

```
dist/
  index.html      — marketing landing page
  convert.html    — working PDF → Markdown converter UI
  obsidian.html   — Obsidian plugin landing
```

Each file inlines its CSS, JS, fonts, and libraries (React, KaTeX, PDF.js, marked). They work offline and can be served from any static host.

---

## Deploy in 30 seconds

Pick one:

### Vercel
```bash
npx vercel dist
```

### Netlify
```bash
npx netlify deploy --dir=dist --prod
```

### GitHub Pages
1. Push `dist/` to a `gh-pages` branch
2. Settings → Pages → choose branch
3. Done.

### Cloudflare Pages
```bash
npx wrangler pages deploy dist
```

### Static file host (S3, nginx, anything)
Just upload the three files. That's it.

---

## Backend wiring (only needed for `convert.html`)

`convert.html` calls a **conversion engine** to turn extracted PDF text into clean Markdown with LaTeX math. Inside the Claude preview environment, this is wired up automatically via `window.claude.complete`.

**On a self-hosted deployment**, that bridge isn't available — you'll see a banner explaining this, and the UI will fall back to emitting the raw extracted PDF text without LLM cleanup. To get the full math-preserving output, wire up an API endpoint:

### Option A — Anthropic API (server-side proxy)

Add a tiny serverless function (e.g. `/api/convert`) that proxies to the Anthropic Messages API:

```js
// api/convert.js (Vercel/Netlify function)
export default async function handler(req, res) {
  const { prompt } = req.body;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await r.json();
  res.json({ text: data.content?.[0]?.text || '' });
}
```

Then in `convert.html`, replace the `window.claude.complete(prompt)` call (search for it in the inlined script) with:

```js
const r = await fetch('/api/convert', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ prompt }),
});
return (await r.json()).text;
```

### Option B — Other LLM providers

Any chat-completion API works the same way. Just keep the prompt template (`PROMPT_TEMPLATE` in the source) — it's tuned for math preservation.

### Option C — Local extraction only

If you don't want to wire up a model at all, the page already falls back to emitting raw PDF text. Headings, math, and tables won't be auto-detected, but you get a starting point.

---

## File sizes

| File | Size |
|---|---|
| `index.html` | ~3.4 MB |
| `convert.html` | ~3.0 MB |
| `obsidian.html` | ~2.8 MB |

These are large because they inline React, KaTeX (with its 100KB font CSS), PDF.js, and marked. If size matters, edit the source HTML to load these from a CDN instead.

---

## Source

The source lives one folder up:

- `index.html` + `app.jsx` + `sections.jsx` + `converter.jsx` — landing
- `convert.html` + `convert-app.jsx` — working converter
- `obsidian.html` + `obsidian-app.jsx` — Obsidian plugin landing
- `styles.css` — shared design tokens & components
- `convert.css` — converter-specific styles
- `tweaks-panel.jsx` — Tweaks control kit

After editing, re-bundle:
```
super_inline_html input_path=index.html output_path=dist/index.html
```
