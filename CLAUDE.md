# Beantrip

Specialty coffee shop discovery (web + store apps). Owner Lucas is a non-technical solo founder: explain in plain language, and ask before deleting, publishing, sending or spending anything.

## Where things run
- **Frontend** (repo root): React 19, Vite, Tailwind 4, React Router 7. Hosted on Firebase Hosting (project `coffeespots-e1460`) at beantrip.com.
- **Backend** (`server/`): Express + Prisma + PostgreSQL on Railway. Auto-deploys on every push to `main`. The frontend does NOT: it only goes live via `npm run deploy` or the nightly GitHub Action (`refresh-prerender.yml`, 03:00).
- **Apps**: the iOS/Android apps are the website in an Appilix wrapper (QR check-in uses its camera bridge, see `QRCheckIn.jsx`). A native iOS rebuild is in progress outside this repo.

## Commands
- `npm run dev` (frontend) / `cd server && npm run dev` (backend).
- `npm run build`: regenerates the sitemap, builds with Vite, then prerenders every public page into `dist/`.
- `npm run deploy`: build + `firebase deploy --only hosting`.
- Test risky hosting changes first: `npx firebase-tools hosting:channel:deploy <name> --expires 1d` (temporary URL, CORS errors there are expected).

## Rules
- **New public page**: add it to `STATIC_PATHS` in `scripts/generate-sitemap.js` AND to `scripts/prerender.js` with the same title/description as its `PageMeta`, or crawlers and AI tools see an empty page.
- **Translations**: `src/lib/translations.js` has en/de/nl/es and the key counts must match.
- **Shop data**: only specialty coffee shops. No bars, restaurants, diners or chains. Google's `cafe` type does not prove "specialty": check the shop's own description. Beantrip's own ratings are all 0, don't rank by them.
- **Database changes** are one-off scripts in `server/scripts/`. Commit + push, then Lucas runs them in the Railway console of the **backend** service (not Postgres), in a fresh console tab after the deploy finishes (an old tab gives "Cannot find module"). Deploy new photos to Firebase before running a script that points at them.
- Never commit `.env` files. `GOOGLE_PLACES_API_KEY` lives only in `server/.env`.
- Stage files by name, never `git add -A`: Lucas has uncommitted logo/screenshot files in `public/`.

## Gotchas
- No working local database, so verify data features against production after deploying.
- `curl` on this PC needs `--ssl-no-revoke`. Use cache-busting `?cb=N` when checking live pages; the CDN has cached bad responses before.
- Prerendered pages carry `data-prerendered` tags that `Layout.jsx` removes after hydration. Check that a page ends up with one title and one canonical.
- Apple: iOS listing text must never mention Android or Google Play (past rejection). Title, subtitle and keywords are tied to the version in review, so don't change them mid-review.
- Fiverr contractor Martin did the SEO work; his access to the repo was removed.
