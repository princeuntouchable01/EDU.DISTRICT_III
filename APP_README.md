# EDU. DISTRICT III

Student & family academic portal. Static HTML/CSS/JS front end, Supabase back end
(Auth, PostgreSQL with Row Level Security, private Storage), hosted on Vercel.

## Deploy (Vercel)
- Framework preset: **Other**. Build command: none. Output directory: none (repo root).
- `vercel.json` adds security headers (CSP, nosniff, frame denial, referrer policy).

## Supabase settings that must match the live site URL
Dashboard > Authentication > URL Configuration:
- **Site URL**: your production URL, for example `https://edu-district-iii.vercel.app`
- **Redirect URLs**: `<production URL>/login.html` and `https://*-<team-slug>.vercel.app/login.html`
  (the wildcard lets preview deployments work).

Dashboard > Authentication > Policies: minimum password length **8**.

## Secrets
Only the publishable key lives in `js/supabase-client.js`. Never commit the
`service_role` / secret key. Row Level Security protects the data, not the key.

## Changing the Supabase project
Edit the URL in `js/supabase-client.js` and the two `supabase.co` hosts in `vercel.json`
(`img-src` and `connect-src`), otherwise the CSP will block the new project.
