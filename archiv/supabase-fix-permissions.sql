-- Grant table permissions to authenticated users
-- Run this in Supabase SQL Editor

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on shops to anon, authenticated;
grant select, insert, update, delete on home_addresses to anon, authenticated;
grant select, insert, update, delete on routes to anon, authenticated;