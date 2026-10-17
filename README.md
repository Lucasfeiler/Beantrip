# Beantrip

Specialty coffee shop discovery at [beantrip.com](https://beantrip.com).

- **Frontend** (repo root): React + Vite, hosted on Firebase Hosting.
- **Backend** ([server/](server)): Express + Prisma + PostgreSQL on Railway.

## Run locally

```
npm install
npm run dev            # frontend, http://localhost:5173

cd server
npm install
npm run dev            # backend, http://localhost:4000 (needs DATABASE_URL in server/.env)
```

The frontend reads `VITE_API_URL` from `.env`.

## Build and deploy

```
npm run build          # sitemap + Vite build + prerender of every public page
npm run deploy         # build and publish to Firebase Hosting
```

The backend deploys automatically when `main` is pushed. A nightly GitHub Action rebuilds and publishes the site so new shops get prerendered pages. See [CLAUDE.md](CLAUDE.md) for project rules and gotchas.
