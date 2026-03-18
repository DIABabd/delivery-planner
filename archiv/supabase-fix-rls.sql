-- Run this in Supabase SQL Editor to fix RLS policies
-- This drops and recreates all policies (safe to run multiple times)

-- Drop existing policies if any
drop policy if exists "Users can view own shops" on shops;
drop policy if exists "Users can insert own shops" on shops;
drop policy if exists "Users can update own shops" on shops;
drop policy if exists "Users can delete own shops" on shops;

drop policy if exists "Users can view own home" on home_addresses;
drop policy if exists "Users can insert own home" on home_addresses;
drop policy if exists "Users can update own home" on home_addresses;
drop policy if exists "Users can delete own home" on home_addresses;

drop policy if exists "Users can view own routes" on routes;
drop policy if exists "Users can insert own routes" on routes;
drop policy if exists "Users can update own routes" on routes;
drop policy if exists "Users can delete own routes" on routes;

-- Make sure RLS is enabled
alter table shops enable row level security;
alter table home_addresses enable row level security;
alter table routes enable row level security;

-- Recreate all policies
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
