# Quicksilver Rotation — Deployment Guide

Live rotation tracker for your badminton sessions. Track games, winners, scores, and get AI-free match predictions based on actual performance.

---

## Same Supabase project, new tables

This app uses your **existing** Supabase project (the one from quicksilver-tracker). Same login, same database — just 3 new tables. No new Supabase account needed.

---

## Step 1 — Add tables to Supabase

1. Go to your Supabase dashboard → open your existing project
2. Click **SQL Editor** → **New query**
3. Copy everything from `supabase/schema.sql` in this project
4. Paste → click **Run**
5. Check **Database → Tables** — you should see `rotation_sessions`, `rotation_players`, `rotation_results` alongside your existing `players` table

---

## Step 2 — Set up locally

```bash
cd quicksilver-rotation
npm install
cp .env.example .env
```

Open `.env` and paste the **same values** from your quicksilver-tracker `.env`:
```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc…
```

Test it:
```bash
npm run dev
```

Open the local URL → sign in with your existing Quicksilver credentials → create a test session → confirm it saves.

---

## Step 3 — Deploy to Netlify

### Option A — Git-based (recommended)

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/quicksilver-rotation.git
git push -u origin main
```

In Netlify → **Add new site** → **Import from Git** → pick the repo → deploy.

Build settings are auto-detected from `netlify.toml`:
- Build command: `npm run build`
- Publish directory: `dist`

### Option B — Drag and drop

```bash
npm run build
```

Go to `https://app.netlify.com/drop` → drag the `dist/` folder.

### Add env vars to Netlify

**This step is required — the app won't connect to Supabase without it.**

Netlify → your site → **Site configuration** → **Environment variables** → add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then: **Deploys** → **Trigger deploy** → **Deploy site**.

### Rename your site

Site configuration → Change site name → e.g. `quicksilverrotation` → URL becomes `quicksilverrotation.netlify.app`

---

## Step 4 — Use it

1. Open the URL on your phone
2. Sign in with your **same Quicksilver credentials**
3. Add to home screen (one-tap access during sessions)

---

## How the app works

**Sessions list (home):** All your past sessions with progress (X/18 games done).

**New Session:** Enter a name, date, and 6 player names. Player numbers 1–6 map to the rotation algorithm. The algorithm is baked into the app — no setup needed.

**Session Detail — Games tab:**
- Tap **Start** → game goes Live (yellow)
- Tap **Done** → game complete (green)
- Select **Team A** or **Team B** as winner
- Enter the score difference (21-15 → type 6)

**Session Detail — Stats tab:**
- Player leaderboard: games played, wins, win%, avg margin
- Pair performance: all 15 partnerships sorted by win rate (strongest pair at top)

**Session Detail — Predict tab:**
- Select 2 players for Team A, 2 for Team B
- App calculates predicted winner based on individual win rates from the session
- Use it to plan balanced or competitive matchups mid-session

---

## Updating later

```bash
# make changes locally, test with npm run dev
git add .
git commit -m "describe change"
git push
# Netlify auto-deploys in ~60 seconds
```

---

## Common issues

**App loads but can't sign in** — check that email confirmation is disabled in Supabase (Authentication settings).

**Data doesn't appear after login** — check env vars are set in Netlify and you triggered a redeploy.

**Game updates not saving** — check browser console for Supabase errors. Usually a Row Level Security policy issue — re-run the schema SQL.

---

## Cost

Free tier on both services. You're nowhere near the limits.
