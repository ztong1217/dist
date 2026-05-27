# Deploying pdf2md (with working converter)

This folder is a complete static site **plus** one serverless function.

```
dist/
  index.html         marketing landing
  convert.html       PDF → Markdown UI (calls the function below)
  obsidian.html      Obsidian plugin landing
  api/
    convert.js       serverless proxy → Anthropic API
  package.json       declares { type: "module" }
  README.md          you are here
```

---

## Vercel — 3 commands

```bash
cd dist
vercel login
vercel --prod
```

When prompted, set an environment variable:

```
ANTHROPIC_API_KEY = sk-ant-...
```

Get the key from <https://console.anthropic.com/settings/keys>. Vercel will auto-detect `api/convert.js` and turn it into a serverless endpoint at `/api/convert`. The front-end probes that path on load and switches into "self-hosted" mode automatically.

That's it. Open the URL Vercel gave you, drop a PDF, watch math come out the other side.

### Setting env vars after deploy

```bash
vercel env add ANTHROPIC_API_KEY production
# paste the key when prompted, then redeploy:
vercel --prod
```

Or do it in the Vercel dashboard under **Project → Settings → Environment Variables**.

---

## Netlify — same idea, different paths

Netlify expects functions under `netlify/functions/`. Move the file:

```bash
mkdir -p netlify/functions
mv api/convert.js netlify/functions/convert.js
```

Then add `netlify.toml` at the dist root:

```toml
[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/api/convert"
  to = "/.netlify/functions/convert"
  status = 200
```

Deploy:

```bash
netlify deploy --dir=. --prod
netlify env:set ANTHROPIC_API_KEY sk-ant-...
```

---

## Cloudflare Pages

Cloudflare expects functions under `functions/`. Move:

```bash
mkdir -p functions/api
mv api/convert.js functions/api/convert.js
```

Then rewrite `functions/api/convert.js` to use the Cloudflare Pages function signature (it's slightly different — `onRequest` instead of `default export`). Or use a Worker.

For simplicity, Vercel is the easiest path.

---

## Optional environment variables

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | _required_ | Anthropic API key |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` | Model to use |
| `ANTHROPIC_MAX_TOKENS` | `1024` | Max output tokens per page |

Haiku is fast and cheap, good for most PDFs. Bump to `claude-sonnet-4-5` for tricky math-heavy textbook chapters at the cost of latency.

---

## Cost estimate

With Haiku at default settings, **a 46-page PDF costs roughly $0.01–0.03** to convert. Inputs are small (a few hundred tokens of text per page), outputs are capped at 1024 tokens per page.

---

## Backend detection — how the front-end picks a backend

`convert.html` calls `callModel(prompt)` which tries, in order:

1. `window.claude.complete(prompt)` — works inside the Claude artifact preview
2. `POST /api/convert { prompt }` — works on your deployed site once the function is wired up
3. **Fallback**: emits raw extracted text without LLM cleanup, with a banner explaining why

You can also wire pdf2md to **any** LLM provider — just edit `api/convert.js` to call OpenAI / Groq / Together / a self-hosted model instead. Keep the request/response shape the same:

```
Request:   POST /api/convert  body: { prompt: "..." }
Response:  200 OK              body: { text: "..." }
```

---

## Rebuilding the bundles

The HTML files in this folder are pre-bundled — fonts, React, KaTeX, PDF.js, marked.js are all inlined. The source lives one folder up.

To edit and rebuild, work from the project root, then re-run the bundler on each entry HTML. See the project's source folder for the unbundled `.jsx` / `.css` files.
