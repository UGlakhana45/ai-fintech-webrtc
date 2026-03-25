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
- **HTTPS**: Enable the platform’s HTTPS URL and point `NEXT_PUBLIC_SIGNALING_URL` at it.

Health check: `GET /health` → `{ "ok": true }`.

## Open source

- Copy **`.env.example`** and **`signaling-server/env.example`**; do **not** commit real URLs or tokens.
- Licensed under **MIT** (see `LICENSE`).

## Scripts

- `npm run dev` — Next dev (localhost).
- `npm run dev:lan` — Next dev bound to `0.0.0.0` for LAN testing.
- `npm run build` / `npm run start` — production Next (e.g. self-hosted).
- `signaling-server`: `npm start` — signaling server.
