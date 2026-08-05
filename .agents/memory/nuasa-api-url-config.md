---
name: NUASA API URL configuration
description: How the frontend resolves the API base URL and what breaks in each environment
---

# NUASA API URL resolution

`getApiBase()` in `src/lib/api.ts` resolves in this order:
1. `window.__NUASA_API_URL__` (set by `public/config.js`, loaded before the React bundle)
2. `import.meta.env.VITE_API_URL` (baked in at build time)
3. `/api` (fallback, proxied by Vite dev server)

**Why:** The frontend is deployed on two hosts — Replit (dev) and afeeshost (static). The runtime config.js allows changing the API URL on afeeshost without rebuilding.

## Per-environment rules

| Environment | What to do |
|---|---|
| Replit dev | Leave `window.__NUASA_API_URL__` commented out in `public/config.js`; do NOT set `VITE_API_URL` env var. Falls through to `/api` → proxied by Vite. |
| afeeshost (production) | Uncomment `window.__NUASA_API_URL__` in the deployed `config.js`, pointing to the Replit production URL. |
| Build for afeeshost | Build with `config.js` uncommented OR rebuild after the API is published and update config.js, then re-zip `dist/public/`. |

## Common failure pattern
Setting `VITE_API_URL` as a Replit env var causes the dev bundle to call the production URL → CORS errors in preview. Deleting that env var fixes it.

**How to apply:** Whenever the "failed to fetch" error appears on admin login in Replit preview, check that `VITE_API_URL` is not set and `config.js` in source has the URL commented out.
