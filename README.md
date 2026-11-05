# IFDSP Website & Membership Portal — deployable package

Node.js (18+) + Express. One server file (`server.js`) and one page file (`public/index.html`, React + Tailwind via CDN).
**Online payments are suspended in this release.** Applications go straight to review; the Secretariat sends payment instructions.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and set `SESSION_SECRET` (random, 32+ chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
3. `npm start` then open http://localhost:3000
The administrator account is created on first start from the two ADMIN_ variables. Log in with it to reach **Admin**.

## Deploy
- **VPS (recommended for data safety):** install Node 18+, upload this folder, `npm install --omit=dev`, set env vars, run with `pm2 start server.js --name ifdsp`, put Nginx/Caddy in front for HTTPS and set `NODE_ENV=production`.
- **Render / Railway / Fly:** build `npm install`, start `npm start`. Attach a **persistent disk** and set `DATA_DIR` to its path, otherwise applications and uploaded documents are lost on redeploy.
- Always serve over HTTPS (session cookie is `Secure` in production).

## What is included
Public pages (Home, About, Membership with all 9 categories and criteria, Programmes, Foundation, Contact, Legal), account registration/login (scrypt-hashed passwords, signed HttpOnly session cookie), application form with private document upload (PDF/JPG/PNG/DOC/DOCX, 5 files × 5 MB), applicant portal with status and digital card, admin review (approve / reject / request information), admin-managed fees (USD/NGN), audit log, public member-ID verification.
Data is stored in `data/db.json` and `data/uploads/` (private; served only to the owner and admins). **Back up the `data` folder regularly.**

## Not included yet (plan before launch)
- Email delivery (verification, notifications) — needs an email provider (SMTP/Resend/SendGrid).
- Online payments — the Paystack integration is parked in `disabled/paystack-payments.js`; re-enable once the Paystack account and entity are approved.
- Database upgrade (Postgres/MongoDB) if volume grows; malware scanning of uploads; multi-factor authentication; password reset.
- Legal pages, vision/mission wording and the Fellow fee ($850) must be approved by IFDSP before launch.
