-- ═══════════════════════════════════════════════════════════════════
-- Quicksilver Rotation — Database Schema
-- Run this in your EXISTING Supabase project (same one as quicksilver-tracker)
-- Adds 3 new tables. Does NOT touch your existing 'players' table.
-- ═══════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════
-- Quicksilver Club — Database Schema
-- Paste this into Supabase SQL Editor and click "Run"
-- ═══════════════════════════════════════════════════════════════════
-- Quicksilver-tracker app tables
-- Players table
create table if not exists public.players (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  username text,
  phone text,
  locality text,
  skill text not null default 'intermediate',
  skill_check_badge text,
  preferred_court text,
  preferred_timings text,
  requested_date date,
  requested_slot text,
  sessions_played integer default 0,
  first_played date,
  last_played date,
  tags text[] default array[]::text[],
  notes text default '',
  from_prospect boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill columns on existing installs (safe to re-run)
alter table public.players add column if not exists username text;
alter table public.players add column if not exists locality text;
alter table public.players add column if not exists skill_check_badge text;
alter table public.players add column if not exists preferred_court text;
alter table public.players add column if not exists preferred_timings text;
alter table public.players add column if not exists requested_date date;
alter table public.players add column if not exists requested_slot text;
alter table public.players add column if not exists from_prospect boolean not null default false;
alter table public.players add column if not exists rotation_wins integer default 0;

-- Index for fast lookups by user
create index if not exists players_user_id_idx on public.players(user_id);

-- Enable Row Level Security
alter table public.players enable row level security;

-- Drop existing policies if re-running this script
drop policy if exists "Users see own players" on public.players;
drop policy if exists "Users insert own players" on public.players;
drop policy if exists "Users update own players" on public.players;
drop policy if exists "Users delete own players" on public.players;

-- Policies: each user can only see/modify their own players
create policy "Users see own players"
  on public.players for select
  using (auth.uid() = user_id);

create policy "Users insert own players"
  on public.players for insert
  with check (auth.uid() = user_id);

create policy "Users update own players"
  on public.players for update
  using (auth.uid() = user_id);

create policy "Users delete own players"
  on public.players for delete
  using (auth.uid() = user_id);

-- Trigger to keep updated_at fresh
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists players_updated_at on public.players;
create trigger players_updated_at
  before update on public.players
  for each row execute function public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- Games table — one row per logged game, with profit (₹, may be negative)
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.games (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  played_on date not null default current_date,
  profit integer not null default 0,
  time_slot text,
  num_courts integer not null default 1,
  shuttles_used integer not null default 0,
  shuttle_labels text[] default array[]::text[],
  player_ids uuid[] default array[]::uuid[],
  player_names text[] default array[]::text[],
  notes text default '',
  created_at timestamptz default now()
);

-- Backfill columns on existing installs (safe to re-run)
alter table public.games add column if not exists time_slot text;
alter table public.games add column if not exists num_courts integer not null default 1;
alter table public.games add column if not exists shuttles_used integer not null default 0;
alter table public.games add column if not exists shuttle_labels text[] default array[]::text[];
alter table public.games add column if not exists player_ids uuid[] default array[]::uuid[];
alter table public.games add column if not exists player_names text[] default array[]::text[];

create index if not exists games_user_id_idx on public.games(user_id);

alter table public.games enable row level security;

drop policy if exists "Users see own games" on public.games;
drop policy if exists "Users insert own games" on public.games;
drop policy if exists "Users update own games" on public.games;
drop policy if exists "Users delete own games" on public.games;

create policy "Users see own games"
  on public.games for select using (auth.uid() = user_id);
create policy "Users insert own games"
  on public.games for insert with check (auth.uid() = user_id);
create policy "Users update own games"
  on public.games for update using (auth.uid() = user_id);
create policy "Users delete own games"
  on public.games for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- Prospects table — people who want to join future games
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.prospects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  username text,
  phone text,
  skill text not null default 'intermediate',
  skill_check_badge text,
  potential text not null default 'medium',
  area text,
  preferred_court text,
  preferred_timings text,
  requested_date date,
  requested_slot text,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill columns on existing installs (safe to re-run)
alter table public.prospects add column if not exists username text;
alter table public.prospects add column if not exists skill_check_badge text;
alter table public.prospects add column if not exists area text;
alter table public.prospects add column if not exists preferred_court text;
alter table public.prospects add column if not exists preferred_timings text;
alter table public.prospects add column if not exists requested_date date;
alter table public.prospects add column if not exists requested_slot text;

create index if not exists prospects_user_id_idx on public.prospects(user_id);

alter table public.prospects enable row level security;

drop policy if exists "Users see own prospects" on public.prospects;
drop policy if exists "Users insert own prospects" on public.prospects;
drop policy if exists "Users update own prospects" on public.prospects;
drop policy if exists "Users delete own prospects" on public.prospects;

create policy "Users see own prospects"
  on public.prospects for select using (auth.uid() = user_id);
create policy "Users insert own prospects"
  on public.prospects for insert with check (auth.uid() = user_id);
create policy "Users update own prospects"
  on public.prospects for update using (auth.uid() = user_id);
create policy "Users delete own prospects"
  on public.prospects for delete using (auth.uid() = user_id);

drop trigger if exists prospects_updated_at on public.prospects;
create trigger prospects_updated_at
  before update on public.prospects
  for each row execute function public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- Shuttles table — shuttle purchases (the only business investment)
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.shuttles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  purchased_on date not null default current_date,
  brand text default '',
  prefix text default '',
  quantity integer not null default 0,
  total_cost integer not null default 0,
  notes text default '',
  created_at timestamptz default now()
);

-- Backfill columns on existing installs (safe to re-run)
alter table public.shuttles add column if not exists prefix text default '';

create index if not exists shuttles_user_id_idx on public.shuttles(user_id);

alter table public.shuttles enable row level security;

drop policy if exists "Users see own shuttles" on public.shuttles;
drop policy if exists "Users insert own shuttles" on public.shuttles;
drop policy if exists "Users update own shuttles" on public.shuttles;
drop policy if exists "Users delete own shuttles" on public.shuttles;

create policy "Users see own shuttles"
  on public.shuttles for select using (auth.uid() = user_id);
create policy "Users insert own shuttles"
  on public.shuttles for insert with check (auth.uid() = user_id);
create policy "Users update own shuttles"
  on public.shuttles for update using (auth.uid() = user_id);
create policy "Users delete own shuttles"
  on public.shuttles for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- Sessions table — planned/upcoming sessions with court + payment detail.
-- A session is rolled into `games` (and deleted) when marked played.
-- participants jsonb: [{ ref:'player'|'prospect', id, name, skill,
--   skillCheckBadge, court:int|null, payment:'unpaid'|'online'|'turftown',
--   extra:bool }]
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'upcoming',
  scheduled_on date not null default current_date,
  time_slot text,
  num_courts integer not null default 1,
  participants jsonb not null default '[]'::jsonb,
  shuttle_labels text[] default array[]::text[],
  profit integer not null default 0,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);

alter table public.sessions enable row level security;

drop policy if exists "Users see own sessions" on public.sessions;
drop policy if exists "Users insert own sessions" on public.sessions;
drop policy if exists "Users update own sessions" on public.sessions;
drop policy if exists "Users delete own sessions" on public.sessions;

create policy "Users see own sessions"
  on public.sessions for select using (auth.uid() = user_id);
create policy "Users insert own sessions"
  on public.sessions for insert with check (auth.uid() = user_id);
create policy "Users update own sessions"
  on public.sessions for update using (auth.uid() = user_id);
create policy "Users delete own sessions"
  on public.sessions for delete using (auth.uid() = user_id);

drop trigger if exists sessions_updated_at on public.sessions;
create trigger sessions_updated_at
  before update on public.sessions
  for each row execute function public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- Partners — people hosting games at other venues, and the games they host
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.partners (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  venue text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists partners_user_id_idx on public.partners(user_id);

alter table public.partners enable row level security;

drop policy if exists "Users see own partners" on public.partners;
drop policy if exists "Users insert own partners" on public.partners;
drop policy if exists "Users update own partners" on public.partners;
drop policy if exists "Users delete own partners" on public.partners;

create policy "Users see own partners"
  on public.partners for select using (auth.uid() = user_id);
create policy "Users insert own partners"
  on public.partners for insert with check (auth.uid() = user_id);
create policy "Users update own partners"
  on public.partners for update using (auth.uid() = user_id);
create policy "Users delete own partners"
  on public.partners for delete using (auth.uid() = user_id);

drop trigger if exists partners_updated_at on public.partners;
create trigger partners_updated_at
  before update on public.partners
  for each row execute function public.handle_updated_at();

-- A partner's hosted game. joined jsonb: [{ ref:'player'|'prospect', id, name }]
create table if not exists public.partner_games (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  partner_id uuid references public.partners(id) on delete cascade not null,
  played_on date not null default current_date,
  slot_from text,
  slot_to text,
  price_per_game integer not null default 0,
  hosting_price integer not null default 0,
  court_price integer not null default 0,
  players_added integer not null default 0,
  joined jsonb not null default '[]'::jsonb,
  notes text default '',
  created_at timestamptz default now()
);

-- Backfill columns on existing installs (safe to re-run)
alter table public.partner_games add column if not exists slot_from text;
alter table public.partner_games add column if not exists slot_to text;

create index if not exists partner_games_user_id_idx on public.partner_games(user_id);
create index if not exists partner_games_partner_id_idx on public.partner_games(partner_id);

alter table public.partner_games enable row level security;

drop policy if exists "Users see own partner_games" on public.partner_games;
drop policy if exists "Users insert own partner_games" on public.partner_games;
drop policy if exists "Users update own partner_games" on public.partner_games;
drop policy if exists "Users delete own partner_games" on public.partner_games;

create policy "Users see own partner_games"
  on public.partner_games for select using (auth.uid() = user_id);
create policy "Users insert own partner_games"
  on public.partner_games for insert with check (auth.uid() = user_id);
create policy "Users update own partner_games"
  on public.partner_games for update using (auth.uid() = user_id);
create policy "Users delete own partner_games"
  on public.partner_games for delete using (auth.uid() = user_id);

-- Sessions (one per court per session)
create table if not exists public.rotation_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  session_date date default current_date,
  closed_at timestamptz default null,
  mode text default 'balanced',
  created_at timestamptz default now()
);
-- Add columns if upgrading from previous schema
alter table public.rotation_sessions add column if not exists closed_at timestamptz default null;
alter table public.rotation_sessions add column if not exists mode text default 'balanced';
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
  player_id uuid references public.players(id),
  skill text,
  constraint rotation_players_session_number unique (session_id, player_number)
);
alter table public.rotation_players add column if not exists player_id uuid references public.players(id);
alter table public.rotation_players add column if not exists skill text;
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
