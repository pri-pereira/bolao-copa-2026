-- ============================================================
-- BOLÃO COPA 2026 — Schema Supabase
-- Execute no SQL Editor do Supabase (Settings > SQL Editor)
-- ============================================================

-- 1. Perfis de usuário (ligado ao Supabase Auth)
create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  apelido      text not null,
  avatar       text not null default '1889-hamster2.png',
  is_admin     boolean not null default false,
  created_at   timestamptz default now()
);

-- 2. Jogos da Copa
create table public.matches (
  id              serial primary key,
  team_a          text not null,
  team_b          text not null,
  flag_a          text default '⚽',
  flag_b          text default '⚽',
  match_datetime  timestamptz not null,
  group_name      text,
  score_a         integer,
  score_b         integer,
  finished        boolean not null default false,
  api_fixture_id  integer unique,   -- ID da API-Football
  created_at      timestamptz default now()
);

-- 3. Palpites
create table public.picks (
  id          serial primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  match_id    integer not null references public.matches(id) on delete cascade,
  score_a     integer not null default 0,
  score_b     integer not null default 0,
  updated_at  timestamptz default now(),
  unique (profile_id, match_id)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.matches  enable row level security;
alter table public.picks    enable row level security;

-- Profiles: qualquer um lê; só o próprio usuário escreve
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Matches: qualquer um lê; só admin escreve (via service role no servidor)
create policy "matches_select" on public.matches for select using (true);

-- Picks: qualquer um lê (pra ranking); só o próprio usuário cria/altera
create policy "picks_select" on public.picks for select using (true);
create policy "picks_insert" on public.picks for insert with check (auth.uid() = profile_id);
create policy "picks_update" on public.picks for update using (auth.uid() = profile_id);

-- ============================================================
-- Trigger: criar profile automaticamente após signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- O apelido e o avatar vêm do metadata passado no signUp
  insert into public.profiles (id, apelido, avatar)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'apelido', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar', '1889-hamster2.png')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Primeiro admin: após criar sua conta, torne-se admin
-- Troque 'seu@email.com' pelo email que você vai usar
-- ============================================================
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'seu@email.com');
