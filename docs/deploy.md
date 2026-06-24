# Deploying ChatGPT Exporter

ChatGPT Exporter is a **userscript** — the build produces a single
`dist/chatgpt.user.js`. "Deploying" means **hosting that userscript together with a
one-click install landing page** so anyone can install it with a userscript
manager (Tampermonkey / Violentmonkey). When a manager is installed, navigating to
a `*.user.js` URL triggers the install dialog automatically.

This repo ships a small static-site pipeline and several deploy targets. Pick one.

---

## TL;DR — one-command deploy

```bash
# Self-host with Docker (no external account needed):
pnpm run deploy            # = docker compose up -d --build
# → open http://localhost:8080  (override with PORT=9000 pnpm run deploy)
```

Other targets:

```bash
pnpm run deploy:vercel      # deploy to Vercel       (needs `vercel login` once)
pnpm run deploy:cloudflare  # deploy to Cloudflare Pages (needs `wrangler login` once)
```

---

## What gets deployed

`scripts/build-site.mjs` assembles a static directory, `dist-site/`:

| File               | Purpose                                                        |
| ------------------ | ------------------------------------------------------------- |
| `index.html`       | Install landing page (source: `site/index.html`, version injected) |
| `chatgpt.user.js`  | The built userscript                                           |
| `_headers`         | Cloudflare Pages headers — serves the userscript as JavaScript |

Build it on its own with:

```bash
pnpm run site:build         # → dist-site/
pnpm run preview:site       # build + serve at http://localhost:8080
```

> Userscript managers only intercept files served with a JavaScript content-type.
> Every target below is configured to send `Content-Type: text/javascript` for
> `chatgpt.user.js` (nginx config, `vercel.json`, and `_headers` respectively).

### Pro checkout configuration

Set `LEMONSQUEEZY_STORE_ID` (or `VITE_LEMONSQUEEZY_STORE_ID`) at build time to enable the in-app **Buy Pro**
button.

`LEMONSQUEEZY_STORE_ID` (or `VITE_LEMONSQUEEZY_STORE_ID`) can be either:

- the full hosted Lemon Squeezy checkout URL (preferred)
- a host/path fragment that resolves to the hosted checkout URL

```bash
LEMONSQUEEZY_STORE_ID="https://your-store.lemonsqueezy.com/buy/..." pnpm run build
```

When this value is empty, the Pro gate still verifies pasted license keys, but
the in-app checkout button stays disabled.

---

## Option 1 — Docker (self-host)

Fully self-contained; builds the site inside the image and serves it with nginx.

```bash
pnpm run deploy                       # docker compose up -d --build
PORT=9000 pnpm run deploy             # custom host port
docker compose down                   # stop

# Or without compose:
docker build -t chatgpt-exporter .
docker run -d -p 8080:80 chatgpt-exporter
```

Files: [`Dockerfile`](../Dockerfile), [`docker-compose.yml`](../docker-compose.yml),
[`deploy/nginx.conf`](../deploy/nginx.conf).

Deploy this image to any container host (Render, Fly.io, Railway, a VPS, etc.) —
it listens on port `80` and has a built-in health check on `/chatgpt.user.js`.

## Option 2 — Vercel

```bash
npx vercel login        # once
pnpm run deploy:vercel  # vercel deploy --prod
```

[`vercel.json`](../vercel.json) declares the build command (`pnpm run site:build`),
the output directory (`dist-site`), and the userscript content-type header. You can
also import the repo in the Vercel dashboard — no extra config needed.

## Option 3 — Cloudflare Pages

```bash
npx wrangler login          # once
pnpm run deploy:cloudflare  # wrangler pages deploy dist-site --project-name chatgpt-exporter
```

The `_headers` file in `dist-site/` sets the userscript content-type. For
dashboard-based Pages projects, use build command `pnpm run site:build` and output
directory `dist-site`.

---

## CI/CD — `.github/workflows/deploy.yml`

On every push to `master` (and via the **Actions → Deploy → Run workflow** button):

1. **build-site** — builds `dist-site/` and uploads it as a workflow artifact.
2. **deploy-cloudflare** — deploys to Cloudflare Pages **only if** the repo secrets
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set (otherwise skipped
   with a notice).
3. **docker** — builds and pushes the image to
   `ghcr.io/<owner>/<repo>:latest` using the built-in `GITHUB_TOKEN`.

### Required secrets (optional integrations)

| Secret                  | Needed for             |
| ----------------------- | ---------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare Pages deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Pages deploy |

The GHCR image publish needs no extra secrets.

---

## Notes

- The hosted page is **only an installer** — the exporter itself runs entirely in
  the visitor's browser against ChatGPT. Hosting it adds no backend and collects no
  data.
- The canonical public distribution remains Greasyfork / the Chrome Web Store (see
  [`docs/listing.md`](./listing.md)); this deploy pipeline is for self-hosting and
  preview/staging builds.
