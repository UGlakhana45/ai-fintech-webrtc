# AI Fintech Dashboard + Live Advisor (WebRTC)

Next.js dashboard with mocked financial data and a **Live Advisor** panel that uses **WebRTC** and a **separate Socket.io signaling server**.

Forks and contributors run their **own** signaling deployment and set environment variables. **No secrets belong in the repo**—copy `.env.example` to `.env.local` and fill in values locally; on Vercel, set the same keys in the project dashboard.

## Architecture

| Part | Stack | Hosting |
|------|--------|---------|
| Dashboard | Next.js (App Router), TypeScript, Tailwind | **Vercel** (recommended) |
| Signaling | Node.js, Express, Socket.io | **Not** on Vercel serverless—use Railway, Render, Fly.io, a VPS, or HTTPS tunnel |

The browser **must** load the app and connect to signaling with compatible protocols: **HTTPS pages require `https://` (or WSS) signaling** (mixed content rules).

## Environment variables (Next.js / Vercel)

Create `.env.local` from `.env.example` for local development. On **Vercel**: **Settings → Environment Variables** (Production / Preview as needed).

| Name | Required on Vercel | Description |
|------|---------------------|-------------|
| `NEXT_PUBLIC_SIGNALING_URL` | **Yes** | Public URL of your Socket.io server, **`https://…`** when the site is on HTTPS. Example: `https://signals.myapp.com` |
| `NEXT_PUBLIC_SIGNALING_PORT` | No | Default `3001`. Only used for **LAN HTTP** dev when the URL is inferred from the current host. |
| `ALLOWED_DEV_ORIGINS` | No | Comma-separated hostnames (no `http://`) for Next **dev** HMR when opening the app by LAN IP. Not needed for production. |

After changing env vars on Vercel, **redeploy** so the client bundle picks up `NEXT_PUBLIC_*` values.

## Environment variables (signaling server)

Copy `signaling-server/env.example` to `signaling-server/.env` on the machine or platform that runs the server.

| Name | Description |
|------|-------------|
| `PORT` | Listen port (default `3001`). |
| `HOST` | Bind address (default `0.0.0.0`). |
| `SIGNALING_CORS_ORIGIN` | Your **Next.js origin(s)**, comma-separated, e.g. `https://your-app.vercel.app`. For local experiments only, `*` allows any origin (do not use in production). |

TLS usually terminates at your host or reverse proxy; the app URL Socket.io clients use should be **`https://`** if the dashboard is on HTTPS.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

```bash
cd signaling-server && npm install && npm start
```

For other devices on your LAN: `npm run dev:lan`, set `NEXT_PUBLIC_SIGNALING_URL` to `http://<your-computer-ip>:3001`, and `ALLOWED_DEV_ORIGINS` to that IP. See `.env.example`.

## Deploy dashboard to Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. Import the repo in [Vercel](https://vercel.com).
3. Set **Environment Variables**:
   - `NEXT_PUBLIC_SIGNALING_URL` = `https://<your-signaling-host>` (must match **HTTPS** if the site is HTTPS).
4. Deploy.

`vercel.json` pins the **Next.js** framework; builds use `npm run build` by default.

## Deploy signaling (for everyone using your fork)

Use any long-lived Node host. Examples:

- **Railway / Render / Fly.io**: Node start command `node server.js`, set `PORT` from the platform, set `SIGNALING_CORS_ORIGIN` to your Vercel URL.

### Render (`signaling-server` in this monorepo)

1. **New Web Service** → connect this repo → branch you use for deploys.
2. **Root directory**: `signaling-server`.
3. **Build command**: `npm install` (or `npm install && npm run build` — a small `build` script is included so this passes).
4. **Start command**: `npm start`.
5. Set **`SIGNALING_CORS_ORIGIN`** to `https://<your-vercel-app>.vercel.app`.
6. After deploy, use the service **HTTPS URL** as **`NEXT_PUBLIC_SIGNALING_URL`** on Vercel.

Optional: `render.yaml` in the repo root configures the same defaults for [Render Blueprints](https://docs.render.com/docs/infrastructure-as-code).
- **HTTPS**: Enable the platform’s HTTPS URL and point `NEXT_PUBLIC_SIGNALING_URL` at it.

Health check: `GET /health` → `{ "ok": true }`.

### Signaling shows “xhr poll error” (Socket.io)

1. **`SIGNALING_CORS_ORIGIN` on Render** must match your **exact** dashboard origin: `https://your-app.vercel.app` — **no trailing slash**, and the same host you open in the browser (not `www` vs non-`www` mixed up).
2. **`NEXT_PUBLIC_SIGNALING_URL` on Vercel** should be `https://your-service.onrender.com` with **no trailing slash**.
3. **Redeploy both** Render and Vercel after changing env vars.
4. **Render free tier** may sleep; the first connection after idle can fail — retry once the service is warm.
5. If it still fails, temporarily set **`SIGNALING_CORS_ORIGIN`** to **`*`** on Render (dev only) to confirm the issue is CORS, then tighten back to your Vercel URL.

## Open source

- Copy **`.env.example`** and **`signaling-server/env.example`**; do **not** commit real URLs or tokens.
- Licensed under **MIT** (see `LICENSE`).

## Scripts

- `npm run dev` — Next dev (localhost).
- `npm run dev:lan` — Next dev bound to `0.0.0.0` for LAN testing.
- `npm run build` / `npm run start` — production Next (e.g. self-hosted).
- `signaling-server`: `npm start` — signaling server.
