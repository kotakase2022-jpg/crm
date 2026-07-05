-- Restrict spreadsheet import mutations to roles that the application UI also
-- permits. Select remains organization-scoped so non-managers can see history.
drop policy if exists lead_import_settings_org_insert on public.lead_import_settings;
drop policy if exists lead_import_settings_org_update on public.lead_import_settings;
drop policy if exists lead_import_settings_org_delete on public.lead_import_settings;
drop policy if exists lead_import_runs_org_insert on public.lead_import_runs;
drop policy if exists lead_import_runs_org_update on public.lead_import_runs;
drop policy if exists lead_import_runs_org_delete on public.lead_import_runs;

create policy lead_import_settings_role_insert
on public.lead_import_settings for insert
to authenticated
with check (private.current_user_role(organization_id) in ('admin', 'sales_manager'));

create policy lead_import_settings_role_update
on public.lead_import_settings for update
to authenticated
using (private.current_user_role(organization_id) in ('admin', 'sales_manager'))
with check (private.current_user_role(organization_id) in ('admin', 'sales_manager'));

create policy lead_import_settings_role_delete
on public.lead_import_settings for delete
to authenticated
using (private.current_user_role(organization_id) in ('admin', 'sales_manager'));

create policy lead_import_runs_role_insert
on public.lead_import_runs for insert
to authenticated
with check (private.current_user_role(organization_id) in ('admin', 'sales_manager'));

create policy lead_import_runs_role_update
on public.lead_import_runs for update
to authenticated
using (private.current_user_role(organization_id) in ('admin', 'sales_manager'))
with check (private.current_user_role(organization_id) in ('admin', 'sales_manager'));

create policy lead_import_runs_role_delete
on public.lead_import_runs for delete
to authenticated
using (private.current_user_role(organization_id) in ('admin', 'sales_manager'));
