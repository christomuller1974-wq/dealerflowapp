create extension if not exists pgcrypto;

create table if not exists public.invoice_renewal_requests (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references auth.users(id) on delete restrict,
  invoice_number text not null unique,
  amount numeric(12,2) not null default 2000.00 check (amount = 2000.00),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  registered_name text not null,
  company_registration_number text,
  vat_number text,
  billing_address text not null,
  accounts_email text not null,
  contact_person text not null,
  purchase_order_number text,
  status text not null default 'REQUESTED' check (status in ('REQUESTED','PAYMENT_SUBMITTED','ACTIVATED','REJECTED')),
  proof_storage_path text,
  proof_original_name text,
  proof_submitted_at timestamptz,
  activated_at timestamptz,
  activated_by uuid references auth.users(id) on delete set null,
  period_start timestamptz,
  period_end timestamptz,
  receipt_number text unique,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_renewal_requests_dealer_created_idx
  on public.invoice_renewal_requests (dealer_id, created_at desc);
create index if not exists invoice_renewal_requests_status_created_idx
  on public.invoice_renewal_requests (status, created_at desc);

alter table public.invoice_renewal_requests enable row level security;
revoke all on public.invoice_renewal_requests from anon, authenticated;
grant select on public.invoice_renewal_requests to authenticated;
grant all on public.invoice_renewal_requests to service_role;

create or replace function public.is_carscoutza_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select lower(coalesce(auth.jwt() ->> 'email','')) = 'autoexcellence@telkomsa.net';
$$;

revoke all on function public.is_carscoutza_admin() from public, anon;
grant execute on function public.is_carscoutza_admin() to authenticated, service_role;

drop policy if exists "Dealers read own invoice renewal requests" on public.invoice_renewal_requests;
create policy "Dealers read own invoice renewal requests"
on public.invoice_renewal_requests for select to authenticated
using (dealer_id = auth.uid() or public.is_carscoutza_admin());

create or replace function public.set_invoice_renewal_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists invoice_renewal_requests_updated_at on public.invoice_renewal_requests;
create trigger invoice_renewal_requests_updated_at
before update on public.invoice_renewal_requests
for each row execute function public.set_invoice_renewal_updated_at();

create or replace function public.request_invoice_renewal(
  p_registered_name text,
  p_company_registration_number text,
  p_vat_number text,
  p_billing_address text,
  p_accounts_email text,
  p_contact_person text,
  p_purchase_order_number text default null
) returns public.invoice_renewal_requests
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_request public.invoice_renewal_requests%rowtype;
  v_invoice_number text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_registered_name),'') is null
    or nullif(trim(p_billing_address),'') is null
    or nullif(trim(p_accounts_email),'') is null
    or nullif(trim(p_contact_person),'') is null then
    raise exception 'Required invoicing details are missing';
  end if;
  if p_accounts_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'A valid accounts email address is required';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found then raise exception 'Dealer profile not found'; end if;
  if v_profile.approval_status <> 'ACTIVE' or v_profile.dealer_verified is not true or v_profile.admin_blocked is true then
    raise exception 'This dealership is not eligible to renew';
  end if;
  if exists (
    select 1 from public.invoice_renewal_requests
    where dealer_id = v_user_id and status in ('REQUESTED','PAYMENT_SUBMITTED')
  ) then
    raise exception 'An invoice renewal request is already open';
  end if;

  v_invoice_number := 'CSZ-INV-' || to_char(now() at time zone 'Africa/Johannesburg','YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.invoice_renewal_requests (
    dealer_id, invoice_number, registered_name, company_registration_number,
    vat_number, billing_address, accounts_email, contact_person, purchase_order_number
  ) values (
    v_user_id, v_invoice_number, trim(p_registered_name), nullif(trim(p_company_registration_number),''),
    nullif(trim(p_vat_number),''), trim(p_billing_address), lower(trim(p_accounts_email)),
    trim(p_contact_person), nullif(trim(p_purchase_order_number),'')
  ) returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.request_invoice_renewal(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.request_invoice_renewal(text,text,text,text,text,text,text) to authenticated;

create or replace function public.submit_invoice_payment_proof(
  p_request_id uuid,
  p_storage_path text,
  p_original_name text
) returns public.invoice_renewal_requests
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.invoice_renewal_requests%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_request from public.invoice_renewal_requests
    where id = p_request_id and dealer_id = v_user_id for update;
  if not found then raise exception 'Invoice request not found'; end if;
  if v_request.status not in ('REQUESTED','PAYMENT_SUBMITTED') then
    raise exception 'This invoice request cannot accept payment proof';
  end if;
  if p_storage_path not like v_user_id::text || '/' || p_request_id::text || '/%' then
    raise exception 'Invalid proof document path';
  end if;

  update public.invoice_renewal_requests set
    status = 'PAYMENT_SUBMITTED', proof_storage_path = p_storage_path,
    proof_original_name = left(coalesce(p_original_name,'proof-of-payment'),200),
    proof_submitted_at = now()
  where id = p_request_id returning * into v_request;
  return v_request;
end;
$$;

revoke all on function public.submit_invoice_payment_proof(uuid,text,text) from public, anon;
grant execute on function public.submit_invoice_payment_proof(uuid,text,text) to authenticated;

create or replace function public.admin_activate_invoice_payment(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_request public.invoice_renewal_requests%rowtype;
  v_profile public.profiles%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_receipt text;
begin
  if not public.is_carscoutza_admin() then raise exception 'Admin access required'; end if;
  select * into v_request from public.invoice_renewal_requests where id = p_request_id for update;
  if not found then raise exception 'Invoice request not found'; end if;
  if v_request.status = 'ACTIVATED' then
    return jsonb_build_object('already_processed',true,'period_end',v_request.period_end,'receipt_number',v_request.receipt_number);
  end if;
  if v_request.status <> 'PAYMENT_SUBMITTED' or v_request.proof_storage_path is null then
    raise exception 'Payment proof must be submitted before activation';
  end if;
  select * into v_profile from public.profiles where id = v_request.dealer_id for update;
  if not found then raise exception 'Dealer profile not found'; end if;
  if v_profile.approval_status <> 'ACTIVE' or v_profile.dealer_verified is not true or v_profile.admin_blocked is true then
    raise exception 'Dealer is not eligible for reactivation';
  end if;

  v_start := greatest(now(), coalesce(v_profile.paid_until,now()), coalesce(v_profile.admin_free_until,now()));
  v_end := v_start + interval '30 days';
  v_receipt := 'CSZ-EFT-' || to_char(now() at time zone 'Africa/Johannesburg','YYYYMMDD') || '-' ||
    upper(substr(replace(v_request.id::text,'-',''),1,8));

  update public.invoice_renewal_requests set status='ACTIVATED', activated_at=now(), activated_by=auth.uid(),
    period_start=v_start, period_end=v_end, receipt_number=v_receipt
  where id=p_request_id;
  update public.profiles set paid_until=v_end, payment_status='PAID_EFT', active=true, is_active=true
  where id=v_request.dealer_id;

  return jsonb_build_object('already_processed',false,'period_start',v_start,'period_end',v_end,'receipt_number',v_receipt);
end;
$$;

revoke all on function public.admin_activate_invoice_payment(uuid) from public, anon;
grant execute on function public.admin_activate_invoice_payment(uuid) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('invoice-payment-proofs','invoice-payment-proofs',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false,file_size_limit=5242880,
  allowed_mime_types=array['application/pdf','image/jpeg','image/png'];

drop policy if exists "Dealers upload own invoice payment proofs" on storage.objects;
create policy "Dealers upload own invoice payment proofs"
on storage.objects for insert to authenticated
with check (bucket_id='invoice-payment-proofs' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Dealers and admin read invoice payment proofs" on storage.objects;
create policy "Dealers and admin read invoice payment proofs"
on storage.objects for select to authenticated
using (bucket_id='invoice-payment-proofs' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_carscoutza_admin()));

