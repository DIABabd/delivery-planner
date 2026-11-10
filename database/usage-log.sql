-- Usage log: one row every time the app is opened, resumed or logged into.
--
-- HOW TO INSTALL: Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
-- It is safe to run more than once.
--
-- HOW TO READ IT: Supabase dashboard -> Table Editor -> usage_log,
-- or run one of the example queries at the bottom of this file.

create table if not exists public.usage_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  event       text not null,               -- 'open', 'resume' or 'login'
  created_at  timestamptz not null default now(),  -- when the server received it
  client_time timestamptz,                 -- when it happened on the phone
  ip          text,                        -- filled in by the server, not the phone
  country     text,                        -- 2-letter country code, from the IP
  user_agent  text,                        -- phone model / browser
  details     jsonb not null default '{}'  -- screen size, installed or browser, ...
);

create index if not exists usage_log_created_at_idx on public.usage_log (created_at desc);
create index if not exists usage_log_user_id_idx on public.usage_log (user_id);

-- Row level security ON and no policies: users of the app can neither read
-- nor change the log through the API. Only you can see it, in the dashboard.
alter table public.usage_log enable row level security;

-- The app calls this function. The server itself reads the IP address and
-- country from the incoming request, so the app cannot fake them.
create or replace function public.log_usage(
  p_event text,
  p_client_time timestamptz default null,
  p_user_agent text default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text;
begin
  if auth.uid() is null then
    return; -- only logged-in users are logged
  end if;

  if p_event not in ('open', 'resume', 'login') then
    return;
  end if;

  -- x-forwarded-for can be a list "client, proxy1, proxy2": the first is the client.
  v_ip := coalesce(
    headers ->> 'cf-connecting-ip',
    nullif(trim(split_part(headers ->> 'x-forwarded-for', ',', 1)), ''),
    headers ->> 'x-real-ip'
  );

  insert into public.usage_log (user_id, event, client_time, ip, country, user_agent, details)
  values (
    auth.uid(),
    p_event,
    p_client_time,
    v_ip,
    headers ->> 'cf-ipcountry',
    left(coalesce(p_user_agent, headers ->> 'user-agent'), 400),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_usage(text, timestamptz, text, jsonb) from public, anon;
grant execute on function public.log_usage(text, timestamptz, text, jsonb) to authenticated;

-- ── Example queries (run them in the SQL Editor) ──────────────────────────
--
-- The latest 100 entries, with the login name instead of the user id:
--   select l.created_at, u.email, l.event, l.ip, l.country, l.user_agent, l.details
--   from public.usage_log l join auth.users u on u.id = l.user_id
--   order by l.created_at desc limit 100;
--
-- On how many days was the app used, per month (proof of use):
--   select date_trunc('month', created_at) as month,
--          count(distinct created_at::date) as days_used,
--          count(*) as events
--   from public.usage_log group by 1 order by 1 desc;
--
-- Every IP address the app was used from, and when it was last seen (security):
--   select ip, country, count(*) as events, max(created_at) as last_seen
--   from public.usage_log group by ip, country order by last_seen desc;
--
-- Delete entries older than 12 months (do this from time to time):
--   delete from public.usage_log where created_at < now() - interval '12 months';
