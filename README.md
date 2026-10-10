# GymIQ

Personal fitness tracking PWA — React + Vite + Supabase.

Migrated from the original single-file vanilla JS app at
[sachin7421/fitness-tracker](https://github.com/sachin7421/fitness-tracker).
The legacy `index.html` is preserved in `legacy/` as the reference implementation.

## Stack

- React 19 + Vite
- Supabase (auth + jsonb-per-user data store)
- React Router
- Recharts (weight + scorecard charts)
- Cloudflare Worker proxy for Oura Ring API
- GitHub Pages deploy via Actions

## Develop

```bash
npm install
cp .env.example .env   # fill in Supabase anon key
npm run dev
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml` which builds and
publishes to GitHub Pages. Set these as repo secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OURA_PROXY`

## Layout

```
src/
  components/   auth, dashboard, workouts, history, settings, shared
  hooks/        useAuth, useUserData, useOura
  lib/          supabase, state, exerciseDb, workoutGenerator, gamification
  pages/        Dashboard, Workouts, Plan, History, Settings
legacy/         original index.html (3,283 lines) — reference only
```

## Critical implementation notes

1. Never persist `generatedWorkouts` to Supabase — always regenerate.
2. Use local-date strings (`YYYY-MM-DD`), never `toISOString()`.
3. Oura active calories lag — fall back to most recent day with date label.
4. Habit reset checked at midnight via `lastResetDate`.
5. Weekly drink keys are date strings, Sunday = day 0.
6. Exercise weight uses `onBlur` + explicit Save (mobile UX).
7. Supabase save is debounced 1.5s.

## Automation (Oct 2026)

Two Supabase Edge Functions live in `supabase/functions/` and are deployed with
`verify_jwt = false` (each implements its own auth):

- **`ingest-health`** — a 3-action iOS Shortcut POSTs `{ steps }` to a personal link
  (`?token=…&tz=…`, from Settings → *Apple Health auto-sync*); date defaults to "today" in that tz. Rows land
  in `public.health_daily`; the app merges them into `healthData` on load/focus.
- **`send-reminders`** — Web Push. `GET ?vapid=1` returns the public key (the
  function generates and stores the VAPID pair in `app_config` on first run, so the
  private key never leaves Supabase). `POST { test: true }` with a user JWT sends a
  test push. Called by pg_cron every 15 min with `x-cron-secret` to deliver the
  morning workout message and the night-walk/steps message per user's local time.

Schedule (run once in SQL after the function is deployed):

```sql
select cron.schedule('gymiq-send-reminders', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://pgzbwmwkchpvqvftfczm.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_config where key = 'cron_secret')),
    body := '{}'::jsonb)
$$);
```

The service worker is a custom `src/sw.js` (vite-plugin-pwa `injectManifest`) so it
can handle `push` / `notificationclick`. On iPhone, push only works once the app is
added to the Home Screen.
