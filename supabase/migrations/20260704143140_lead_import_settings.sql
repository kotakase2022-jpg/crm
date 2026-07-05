create table public.lead_import_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default '広告スプレッドシート',
  spreadsheet_url text not null,
  default_status text not null default '新規（広告経由）',
  enabled boolean not null default true,
  last_imported_at timestamptz,
  last_run_status text,
  last_run_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.lead_import_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setting_id uuid not null references public.lead_import_settings(id) on delete cascade,
  status text not null default 'running',
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

alter table public.leads
  alter column status set default '新規（広告以外）',
  add column if not exists import_setting_id uuid references public.lead_import_settings(id) on delete set null,
  add column if not exists external_source text,
  add column if not exists external_source_id text,
  add column if not exists imported_at timestamptz;

update public.leads
set status = '新規（広告以外）'
where status = '新規';

create index lead_import_settings_org_idx on public.lead_import_settings (organization_id, deleted_at, enabled);
create index lead_import_runs_setting_idx on public.lead_import_runs (organization_id, setting_id, started_at desc);
create unique index leads_import_source_uidx
  on public.leads (organization_id, import_setting_id, external_source_id)
  where deleted_at is null and import_setting_id is not null and external_source_id is not null;

create trigger lead_import_settings_set_updated_at
before update on public.lead_import_settings
for each row execute function public.set_updated_at();

create trigger lead_import_runs_set_updated_at
before update on public.lead_import_runs
for each row execute function public.set_updated_at();

create trigger lead_import_settings_audit
after insert or update or delete on public.lead_import_settings
for each row execute function public.write_audit_log();

create trigger lead_import_runs_audit
after insert or update or delete on public.lead_import_runs
for each row execute function public.write_audit_log();

alter table public.lead_import_settings enable row level security;
alter table public.lead_import_runs enable row level security;

create policy lead_import_settings_org_select
on public.lead_import_settings for select
to authenticated
using (public.is_organization_member(organization_id));

create policy lead_import_settings_org_insert
on public.lead_import_settings for insert
to authenticated
with check (public.is_organization_member(organization_id));

create policy lead_import_settings_org_update
on public.lead_import_settings for update
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy lead_import_settings_org_delete
on public.lead_import_settings for delete
to authenticated
using (public.is_organization_member(organization_id));

create policy lead_import_runs_org_select
on public.lead_import_runs for select
to authenticated
using (public.is_organization_member(organization_id));

create policy lead_import_runs_org_insert
on public.lead_import_runs for insert
to authenticated
with check (public.is_organization_member(organization_id));

create policy lead_import_runs_org_update
on public.lead_import_runs for update
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy lead_import_runs_org_delete
on public.lead_import_runs for delete
to authenticated
using (public.is_organization_member(organization_id));

grant select, insert, update, delete on public.lead_import_settings to authenticated;
grant select, insert, update, delete on public.lead_import_runs to authenticated;
