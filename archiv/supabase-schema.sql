-- ============================================================
-- PASTE THIS INTO SUPABASE SQL EDITOR (supabase.com > SQL Editor > New query)
-- ============================================================

-- 1. Shops table
create table shops (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null default '',
  address    text not null,
  city       text not null,
  district   text not null default '',
  notes      text not null default '',
  lat        double precision,
  lng        double precision,
  created_at timestamptz default now()
);

-- 2. Home address table
create table home_addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references auth.users(id) on delete cascade,
  address    text not null,
  city       text not null,
  lat        double precision not null,
  lng        double precision not null
);

-- 3. Saved routes table
create table routes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text,
  date         date,
  shop_ids     uuid[] not null,
  optimized    boolean default false,
  distance_km  double precision,
  duration_sec double precision,
  created_at   timestamptz default now()
);

-- 4. Enable Row Level Security (each user can only see their own data)
alter table shops enable row level security;
alter table home_addresses enable row level security;
alter table routes enable row level security;

-- 5. RLS Policies — users can only access their own rows
create policy "Users can view own shops"    on shops for select using (auth.uid() = user_id);
create policy "Users can insert own shops"  on shops for insert with check (auth.uid() = user_id);
create policy "Users can update own shops"  on shops for update using (auth.uid() = user_id);
create policy "Users can delete own shops"  on shops for delete using (auth.uid() = user_id);

create policy "Users can view own home"     on home_addresses for select using (auth.uid() = user_id);
create policy "Users can insert own home"   on home_addresses for insert with check (auth.uid() = user_id);
create policy "Users can update own home"   on home_addresses for update using (auth.uid() = user_id);
create policy "Users can delete own home"   on home_addresses for delete using (auth.uid() = user_id);

create policy "Users can view own routes"   on routes for select using (auth.uid() = user_id);
create policy "Users can insert own routes" on routes for insert with check (auth.uid() = user_id);
create policy "Users can update own routes" on routes for update using (auth.uid() = user_id);
create policy "Users can delete own routes" on routes for delete using (auth.uid() = user_id);

-- 6. Indexes for performance
create index idx_shops_user on shops(user_id);
create index idx_routes_user on routes(user_id);
