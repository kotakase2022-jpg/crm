-- Some Postgres/Supabase sessions deparse public helper functions in
-- pg_policies without the "public." qualifier. Re-run the policy rewrite using
-- both qualified and unqualified matches before public helper EXECUTE is
-- considered unavailable to authenticated users.
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
        coalesce(qual, '') ~ '(^|[^.])is_organization_member\('
        or coalesce(qual, '') ~ '(^|[^.])current_user_role\('
        or coalesce(with_check, '') ~ '(^|[^.])is_organization_member\('
        or coalesce(with_check, '') ~ '(^|[^.])current_user_role\('
      )
  loop
    new_qual := replace(r.qual, 'public.is_organization_member', 'private.is_organization_member');
    new_qual := replace(new_qual, 'public.current_user_role', 'private.current_user_role');
    new_qual := regexp_replace(new_qual, '(^|[^.])is_organization_member\(', '\1private.is_organization_member(', 'g');
    new_qual := regexp_replace(new_qual, '(^|[^.])current_user_role\(', '\1private.current_user_role(', 'g');

    new_check := replace(r.with_check, 'public.is_organization_member', 'private.is_organization_member');
    new_check := replace(new_check, 'public.current_user_role', 'private.current_user_role');
    new_check := regexp_replace(new_check, '(^|[^.])is_organization_member\(', '\1private.is_organization_member(', 'g');
    new_check := regexp_replace(new_check, '(^|[^.])current_user_role\(', '\1private.current_user_role(', 'g');
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
