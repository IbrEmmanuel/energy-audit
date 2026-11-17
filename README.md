# E-tech Solar Proposal System

Full-stack Next.js app: Google login → Energy Audit → System Design → Quotation → live Google Sheet sync → PDF.

**Sheet:** https://docs.google.com/spreadsheets/d/1I0axW4PgeZus3ZfyqOfTiUbn29T_wx2HF3ewQcrSVxg/edit

## Local setup

```bash
cd web
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Use a **Postgres** `DATABASE_URL` (Neon free tier works for local + Vercel).

### Google Cloud

1. Create OAuth **Web** client
2. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-APP.vercel.app/api/auth/callback/google`
3. Consent scopes: `email`, `profile`, `openid`, `https://www.googleapis.com/auth/spreadsheets`
4. Put Client ID + Secret in `.env` / Vercel env

## Deploy on Vercel

1. Push the `web` folder to a GitHub repo (root = this Next app).
2. In [vercel.com](https://vercel.com) → **Add New Project** → import that repo.
3. Create a Postgres DB (Neon via Vercel Storage, or any Postgres) and copy `DATABASE_URL`.
4. Set environment variables:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Postgres connection string (`?sslmode=require`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://YOUR-APP.vercel.app` |
| `AUTH_TRUST_HOST` | `true` |
| `GOOGLE_CLIENT_ID` | from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud |
| `GOOGLE_SHEETS_ID` | `1I0axW4PgeZus3ZfyqOfTiUbn29T_wx2HF3ewQcrSVxg` |

5. Deploy. Build runs `prisma generate` + `prisma db push` + `next build`.
6. Add the Vercel callback URL in Google OAuth, then sign in with the master Google account.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local server |
| `npm run build` | Production build (generates Prisma + pushes schema) |
| `npx prisma db push` | Create/update database schema |
| `npm run test:calc` | Verify load formulas |

## Sheet write contract

Verified live: `E24 = B24 * C24`. App never overwrites formula columns.
