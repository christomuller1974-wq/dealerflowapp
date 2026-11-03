create extension if not exists pgcrypto;

create table if not exists public.featured_vehicle_payments (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references auth.users(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  vehicle_title text not null,
  internal_reference text not null unique,
  m_payment_id text not null unique,
  pf_payment_id text unique,
  amount numeric(12,2) not null check (amount = 200.00),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'PENDING' check (status in ('PENDING','COMPLETE','FAILED','CANCELLED')),
  payment_date timestamptz,
  featured_start timestamptz,
  featured_end timestamptz,
  receipt_number text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complete_featured_payment_fields check (
    status <> 'COMPLETE' or
    (pf_payment_id is not null and payment_date is not null and featured_start is not null and featured_end is not null and receipt_number is not null)
  )
);

create index if not exists featured_vehicle_payments_dealer_created_idx
  on public.featured_vehicle_payments (dealer_id, created_at desc);
create index if not exists featured_vehicle_payments_vehicle_created_idx
  on public.featured_vehicle_payments (vehicle_id, created_at desc);

alter table public.featured_vehicle_payments enable row level security;
revoke all on public.featured_vehicle_payments from anon, authenticated;
grant select on public.featured_vehicle_payments to authenticated;
grant all on public.featured_vehicle_payments to service_role;

drop policy if exists "Dealers read own featured vehicle payments" on public.featured_vehicle_payments;
create policy "Dealers read own featured vehicle payments"
on public.featured_vehicle_payments for select to authenticated
using (dealer_id = auth.uid());

create or replace function public.set_featured_vehicle_payment_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists featured_vehicle_payments_updated_at on public.featured_vehicle_payments;
create trigger featured_vehicle_payments_updated_at
before update on public.featured_vehicle_payments
for each row execute function public.set_featured_vehicle_payment_updated_at();

create or replace function public.finalize_featured_vehicle_payment(
  p_m_payment_id text,
  p_pf_payment_id text,
  p_verified_at timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.featured_vehicle_payments%rowtype;
  v_profile public.profiles%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_receipt text;
begin
  select * into v_payment
  from public.featured_vehicle_payments
  where m_payment_id = p_m_payment_id
  for update;

  if not found then raise exception 'Unknown featured payment reference'; end if;
  if v_payment.status = 'COMPLETE' then
    if v_payment.pf_payment_id <> p_pf_payment_id then
      raise exception 'Completed featured payment reference mismatch';
    end if;
    return jsonb_build_object(
      'already_processed', true,
      'payment_id', v_payment.id,
      'featured_end', v_payment.featured_end
    );
  end if;
  if v_payment.status <> 'PENDING' or v_payment.amount <> 200.00 or v_payment.currency <> 'ZAR' then
    raise exception 'Featured payment is not eligible for finalisation';
  end if;
  if exists (
    select 1 from public.featured_vehicle_payments
    where pf_payment_id = p_pf_payment_id and id <> v_payment.id
  ) then
    raise exception 'PayFast transaction already belongs to another featured payment';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_payment.dealer_id
  for update;

  if not found then raise exception 'Dealer profile not found'; end if;
  if v_profile.approval_status <> 'ACTIVE'
     or v_profile.dealer_verified is not true
     or v_profile.admin_blocked is true then
    raise exception 'Dealer is not eligible to feature a vehicle';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = v_payment.vehicle_id and user_id = v_payment.dealer_id
  for update;

  if not found then raise exception 'Owned vehicle not found'; end if;

  v_start := greatest(
    p_verified_at,
    coalesce(v_vehicle.featured_until, p_verified_at)
  );
  v_end := v_start + interval '7 days';
  v_receipt := 'CSZ-FTR-' ||
    to_char(p_verified_at at time zone 'Africa/Johannesburg', 'YYYYMMDD') || '-' ||
    upper(substr(replace(v_payment.id::text, '-', ''), 1, 8));

  update public.featured_vehicle_payments
  set status = 'COMPLETE',
      pf_payment_id = p_pf_payment_id,
      payment_date = p_verified_at,
      featured_start = v_start,
      featured_end = v_end,
      receipt_number = v_receipt
  where id = v_payment.id;

  update public.vehicles
  set featured = true,
      featured_until = v_end
  where id = v_payment.vehicle_id and user_id = v_payment.dealer_id;

  return jsonb_build_object(
    'already_processed', false,
    'payment_id', v_payment.id,
    'featured_start', v_start,
    'featured_end', v_end,
    'receipt_number', v_receipt
  );
end;
$$;

revoke all on function public.finalize_featured_vehicle_payment(text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.finalize_featured_vehicle_payment(text,text,timestamptz)
  to service_role;
