begin;

create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.dealer_expiry_email_log (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.profiles(id) on delete cascade,
  expiry_date date not null,
  effective_expiry timestamptz not null,
  email text,
  status text not null check (status in ('PROCESSING','SENT','FAILED','SKIPPED')),
  attempts integer not null default 1 check (attempts > 0),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dealer_id, expiry_date)
);

alter table public.dealer_expiry_email_log enable row level security;
revoke all on public.dealer_expiry_email_log from public, anon, authenticated;
grant all on public.dealer_expiry_email_log to service_role;
drop policy if exists "Service role manages expiry email log" on public.dealer_expiry_email_log;
create policy "Service role manages expiry email log" on public.dealer_expiry_email_log for all to service_role using (true) with check (true);

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'expiry_reminder_cron_secret') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'expiry_reminder_cron_secret', 'Authenticates the daily CarScoutZA expiry reminder cron request');
  end if;
end
$$;

create or replace function public.verify_expiry_reminder_cron_secret(p_secret text)
returns boolean language sql stable security definer set search_path = public, vault, pg_temp
as $$
  select coalesce(p_secret, '') <> '' and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'expiry_reminder_cron_secret' limit 1);
$$;
revoke all on function public.verify_expiry_reminder_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_expiry_reminder_cron_secret(text) to service_role;

select cron.schedule(
  'carscoutza-daily-expiry-reminders', '0 6 * * *',
  $cron$
    select net.http_post(
      url := 'https://ddmvzypiccryjndcwlre.supabase.co/functions/v1/send-expiry-reminders',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'expiry_reminder_cron_secret' limit 1)),
      body := jsonb_build_object('source', 'pg_cron', 'scheduled_at', now()),
      timeout_milliseconds := 10000
    ) as request_id;
  $cron$
);

commit;
