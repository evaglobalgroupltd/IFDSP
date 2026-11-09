# IFDSP Website & Membership Portal — React + TypeScript

React 18 + TypeScript + Vite + Tailwind CSS (front end, all pages in `src/App.tsx`) and a single-file Node/Express server (`server.js`).
**Online payments are suspended in this release.** The Paystack code is parked in `disabled/paystack-payments.js`.

## Run for development
1. `npm install`
2. Copy `.env.example` to `.env`; set `SESSION_SECRET` (32+ random chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
3. Terminal 1: `npm start` (API on http://localhost:3000). Terminal 2: `npm run dev` (site on http://localhost:5173, proxies /api).

## Build & run for production
`npm install && npm run build` then `npm start`. The server serves the built `dist/` folder.
- **Render / Railway:** Build command `npm install && npm run build`, Start command `npm start`.
  Add env vars `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NODE_ENV=production`, and a persistent disk with `DATA_DIR` pointing to it.
- **VPS:** same commands, run `pm2 start server.js --name ifdsp`, put Nginx/Caddy in front for HTTPS.
- **Cloudflare Pages/Workers cannot run `server.js`.** Use a Node host and point your domain's DNS at it.

## Fees
The approved fee schedule (all nine categories, USD) is built into `server.js`. On first start of this version it is applied automatically to any existing `data/db.json`, replacing older fee values (kept in the audit log). After that, fees can be changed in Admin. Honorary Fellowship is nomination-only; its $1,500 fee applies only if the nomination is approved.

## Not included yet
Email delivery, password reset, payments, malware scanning of uploads, multi-factor login, database upgrade. Legal pages, vision/mission wording and the Fellow fee must be approved by IFDSP before launch.
