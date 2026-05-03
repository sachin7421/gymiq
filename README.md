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
