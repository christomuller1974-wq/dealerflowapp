begin;

create or replace function public.is_carscoutza_staff_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select (select auth.uid()) in (
    'c2e0121e-e8bd-4846-92d2-695e7679821b'::uuid,
    'bf6467fc-fd7e-41b0-a499-f20ba5153d00'::uuid
  );
$$;

revoke all on function public.is_carscoutza_staff_admin() from public, anon;
grant execute on function public.is_carscoutza_staff_admin()
  to authenticated, service_role;

drop policy if exists "Staff admins read dealer profiles" on public.profiles;
create policy "Staff admins read dealer profiles"
on public.profiles
for select
to authenticated
using ((select public.is_carscoutza_staff_admin()));

-- Clean up any broader draft policies if they were ever applied.
drop policy if exists "Staff admins read dealer vehicles" on public.vehicles;
drop policy if exists "Staff admins read dealer click statistics" on public.vehicle_clicks;
drop policy if exists "Staff admins read site visit statistics" on public.site_visits;

commit;