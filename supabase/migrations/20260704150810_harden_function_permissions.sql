-- Harden function execution context and RPC exposure flagged by Supabase Advisor.
-- Trigger/helper functions do not need caller-dependent search paths.
alter function public.set_updated_at() set search_path = public;
alter function public.set_expected_arr() set search_path = public;
alter function public.set_subscription_arr() set search_path = public;
alter function public.set_health_score_total() set search_path = public;
alter function public.record_deal_stage_history() set search_path = public;
alter function public.write_audit_log() set search_path = public;

-- RLS helper functions and the profile bootstrap RPC require authenticated users,
-- but they should never be executable by anonymous users or the implicit PUBLIC role.
revoke execute on function public.is_organization_member(uuid) from public;
revoke execute on function public.current_user_role(uuid) from public;
revoke execute on function public.ensure_user_profile(text) from public;
revoke execute on function public.is_organization_member(uuid) from anon;
revoke execute on function public.current_user_role(uuid) from anon;
revoke execute on function public.ensure_user_profile(text) from anon;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.current_user_role(uuid) to authenticated;
grant execute on function public.ensure_user_profile(text) to authenticated;

-- Move RLS helper functions out of the exposed public schema. The public
-- bootstrap RPC remains intentional, but membership/role helpers are only for
-- policies and should not be callable through PostgREST RPC.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.deleted_at is null
  );
$$;

create or replace function private.current_user_role(target_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = target_organization_id
    and m.user_id = auth.uid()
    and m.deleted_at is null
  limit 1;
$$;

revoke execute on function private.is_organization_member(uuid) from public;
revoke execute on function private.current_user_role(uuid) from public;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.current_user_role(uuid) to authenticated;

do $$
declare
  r record;
  new_qual text;
  new_check text;
  role_list text;
  create_sql text;
begin
  for r in
    select schemaname, tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%public.is_organization_member%'
        or coalesce(qual, '') like '%public.current_user_role%'
        or coalesce(with_check, '') like '%public.is_organization_member%'
        or coalesce(with_check, '') like '%public.current_user_role%'
      )
  loop
    new_qual := replace(
      replace(r.qual, 'public.is_organization_member', 'private.is_organization_member'),
      'public.current_user_role',
      'private.current_user_role'
    );
    new_check := replace(
      replace(r.with_check, 'public.is_organization_member', 'private.is_organization_member'),
      'public.current_user_role',
      'private.current_user_role'
    );
    role_list := array_to_string(r.roles, ', ');

    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);

    create_sql := format(
      'create policy %I on %I.%I for %s to %s',
      r.policyname,
      r.schemaname,
      r.tablename,
      lower(r.cmd),
      role_list
    );

    if new_qual is not null then
      create_sql := create_sql || ' using (' || new_qual || ')';
    end if;

    if new_check is not null then
      create_sql := create_sql || ' with check (' || new_check || ')';
    end if;

    execute create_sql;
  end loop;
end;
$$;

revoke execute on function public.is_organization_member(uuid) from authenticated;
revoke execute on function public.current_user_role(uuid) from authenticated;
