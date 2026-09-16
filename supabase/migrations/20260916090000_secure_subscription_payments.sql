create extension if not exists pgcrypto;

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references auth.users(id) on delete restrict,
  internal_reference text not null unique,
  m_payment_id text not null unique,
  pf_payment_id text unique,
  amount numeric(12,2) not null check (amount = 2000.00),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'PENDING' check (status in ('PENDING','COMPLETE','FAILED','CANCELLED')),
  payment_date timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  receipt_number text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complete_payment_fields check (
    status <> 'COMPLETE' or
    (pf_payment_id is not null and payment_date is not null and period_start is not null and period_end is not null and receipt_number is not null)
  )
);

alter table public.subscription_payments enable row level security;
revoke all on public.subscription_payments from anon, authenticated;
grant select on public.subscription_payments to authenticated;
grant all on public.subscription_payments to service_role;

drop policy if exists "Dealers read own subscription payments" on public.subscription_payments;
create policy "Dealers read own subscription payments"
on public.subscription_payments for select to authenticated
using (dealer_id = auth.uid());

create or replace function public.set_subscription_payment_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscription_payments_updated_at on public.subscription_payments;
create trigger subscription_payments_updated_at
before update on public.subscription_payments
for each row execute function public.set_subscription_payment_updated_at();

create or replace function public.finalize_subscription_payment(
  p_m_payment_id text,
  p_pf_payment_id text,
  p_verified_at timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.subscription_payments%rowtype;
  v_profile public.profiles%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_receipt text;
begin
  select * into v_payment
  from public.subscription_payments
  where m_payment_id = p_m_payment_id
  for update;

  if not found then raise exception 'Unknown payment reference'; end if;
  if v_payment.status = 'COMPLETE' then
    return jsonb_build_object('already_processed', true, 'payment_id', v_payment.id, 'period_end', v_payment.period_end);
  end if;
  if v_payment.status <> 'PENDING' or v_payment.amount <> 2000.00 or v_payment.currency <> 'ZAR' then
    raise exception 'Payment is not eligible for finalisation';
  end if;
  if exists (select 1 from public.subscription_payments where pf_payment_id = p_pf_payment_id and id <> v_payment.id) then
    raise exception 'PayFast transaction already belongs to another payment';
  end if;

  select * into v_profile from public.profiles where id = v_payment.dealer_id for update;
  if not found then raise exception 'Dealer profile not found'; end if;
  if v_profile.approval_status <> 'ACTIVE' or v_profile.dealer_verified is not true or v_profile.admin_blocked is true then
    raise exception 'Dealer is not eligible for reactivation';
  end if;

  v_start := greatest(p_verified_at, coalesce(v_profile.paid_until, p_verified_at), coalesce(v_profile.admin_free_until, p_verified_at));
  v_end := v_start + interval '30 days';
  v_receipt := 'CSZ-' || to_char(p_verified_at at time zone 'Africa/Johannesburg','YYYYMMDD') || '-' || upper(substr(replace(v_payment.id::text,'-',''),1,8));

  update public.subscription_payments set status='COMPLETE', pf_payment_id=p_pf_payment_id,
    payment_date=p_verified_at, period_start=v_start, period_end=v_end, receipt_number=v_receipt
  where id=v_payment.id;

  update public.profiles set paid_until=v_end, payment_status='PAID', active=true, is_active=true
  where id=v_payment.dealer_id;

  return jsonb_build_object('already_processed', false, 'payment_id', v_payment.id, 'period_start', v_start, 'period_end', v_end, 'receipt_number', v_receipt);
end;
$$;

revoke all on function public.finalize_subscription_payment(text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.finalize_subscription_payment(text,text,timestamptz) to service_role;
