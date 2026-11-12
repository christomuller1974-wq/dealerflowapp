begin;

create or replace function public.admin_shuffle_vehicles()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  shuffled_count integer;
begin
  if not public.is_carscoutza_admin() then
    raise exception 'Owner admin access required';
  end if;

  update public.vehicles v
  set
    admin_shuffle_order = random(),
    admin_shuffle_at = now()
  from public.profiles p
  where
    p.id = v.user_id
    and p.dealer_verified is true
    and coalesce(p.admin_blocked, false) is false
    and (
      p.paid_until >= now()
      or p.admin_free_until >= now()
    );

  get diagnostics shuffled_count = row_count;
  return shuffled_count;
end;
$$;

revoke all on function public.admin_shuffle_vehicles() from public, anon;
grant execute on function public.admin_shuffle_vehicles()
  to authenticated, service_role;

commit;