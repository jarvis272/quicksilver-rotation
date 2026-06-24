-- ═══════════════════════════════════════════════════════════════════
-- Quicksilver Rotation — Database Schema
-- Run this in your EXISTING Supabase project (same one as quicksilver-tracker)
-- Adds 3 new tables. Does NOT touch your existing 'players' table.
-- ═══════════════════════════════════════════════════════════════════

-- Sessions (one per court per session)
create table if not exists public.rotation_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  session_date date default current_date,
  closed_at timestamptz default null,
  created_at timestamptz default now()
);
-- Add closed_at if upgrading from previous schema
alter table public.rotation_sessions add column if not exists closed_at timestamptz default null;
create index if not exists rotation_sessions_user_idx on public.rotation_sessions(user_id);
alter table public.rotation_sessions enable row level security;
drop policy if exists "Users manage own sessions" on public.rotation_sessions;
create policy "Users manage own sessions"
  on public.rotation_sessions for all using (auth.uid() = user_id);

-- Players for each session (numbers 1–6)
create table if not exists public.rotation_players (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.rotation_sessions(id) on delete cascade not null,
  player_number integer not null check (player_number between 1 and 6),
  player_name text not null,
  constraint rotation_players_session_number unique (session_id, player_number)
);
alter table public.rotation_players enable row level security;
drop policy if exists "Users manage own rotation players" on public.rotation_players;
create policy "Users manage own rotation players"
  on public.rotation_players for all
  using (exists (
    select 1 from public.rotation_sessions s
    where s.id = rotation_players.session_id and s.user_id = auth.uid()
  ));

-- Game results (one row per game per session, created on first update)
create table if not exists public.rotation_results (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.rotation_sessions(id) on delete cascade not null,
  game_number integer not null check (game_number between 1 and 12),
  status text not null default 'pending' check (status in ('pending','live','done')),
  winner text check (winner in ('Team A','Team B')),
  score_diff integer check (score_diff between 1 and 29),
  updated_at timestamptz default now(),
  constraint rotation_results_session_game unique (session_id, game_number)
);
alter table public.rotation_results enable row level security;
drop policy if exists "Users manage own rotation results" on public.rotation_results;
create policy "Users manage own rotation results"
  on public.rotation_results for all
  using (exists (
    select 1 from public.rotation_sessions s
    where s.id = rotation_results.session_id and s.user_id = auth.uid()
  ));
