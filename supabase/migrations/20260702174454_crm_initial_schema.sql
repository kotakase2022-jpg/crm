create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.profiles (
  id uuid primary key,
  organization_id uuid references public.organizations(id),
  email text,
  full_name text,
  role text not null default 'admin' check (role in ('admin','sales_manager','sales','cs_manager','cs','support','finance','viewer')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('admin','sales_manager','sales','cs_manager','cs','support','finance','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique (organization_id, user_id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null default 'issue',
  color text not null default '#2563eb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique (organization_id, category, name)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'prospect',
  industry text,
  company_size text,
  monthly_projects integer default 0,
  monthly_documents integer default 0,
  main_customer_type text,
  current_document_method text,
  accounting_software text,
  primary_device text,
  it_literacy text,
  decision_maker_type text,
  website text,
  prefecture text,
  address text,
  phone text,
  owner_id uuid,
  cs_owner_id uuid,
  next_action_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  company_name text,
  contact_name text,
  email text,
  phone text,
  status text not null default '新規',
  source text,
  issue_tags text[] not null default '{}',
  industry text,
  company_size text,
  monthly_projects integer default 0,
  monthly_documents integer default 0,
  main_customer_type text,
  current_document_method text,
  accounting_software text,
  primary_device text,
  it_literacy text,
  decision_maker_type text,
  owner_id uuid,
  next_action_date date,
  converted_company_id uuid references public.companies(id),
  converted_contact_id uuid,
  converted_deal_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  role text not null default 'その他',
  department text,
  email text,
  phone text,
  mobile text,
  decision_power text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

alter table public.leads
  add constraint leads_converted_contact_id_fkey foreign key (converted_contact_id) references public.contacts(id);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  name text not null,
  stage text not null default '問い合わせ / リード獲得',
  expected_plan text,
  expected_mrr numeric(12,0) not null default 0,
  expected_arr numeric(12,0) not null default 0,
  probability integer not null default 20 check (probability between 0 and 100),
  expected_contract_date date,
  lost_reason text,
  owner_id uuid,
  next_action_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

alter table public.leads
  add constraint leads_converted_deal_id_fkey foreign key (converted_deal_id) references public.deals(id);

create table public.deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  subject text not null,
  content text,
  occurred_at timestamptz not null default now(),
  owner_id uuid,
  lead_id uuid references public.leads(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  has_next_action boolean not null default false,
  next_action_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status text not null default '未完了' check (status in ('未完了','完了')),
  priority text not null default '中' check (priority in ('低','中','高','緊急')),
  due_date date,
  assignee_id uuid,
  lead_id uuid references public.leads(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  support_ticket_id uuid,
  automation_key text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.trials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  start_date date not null,
  end_date date not null,
  first_login_at timestamptz,
  login_count integer not null default 0,
  documents_created integer not null default 0,
  estimates_created integer not null default 0,
  invoices_created integer not null default 0,
  invited_users_count integer not null default 0,
  setup_completion_rate integer not null default 0 check (setup_completion_rate between 0 and 100),
  activation_level integer not null default 0 check (activation_level between 0 and 7),
  paid_conversion_likelihood text not null default '中' check (paid_conversion_likelihood in ('低','中','高')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  plan text not null,
  mrr numeric(12,0) not null default 0,
  arr numeric(12,0) not null default 0,
  started_on date not null,
  renewal_on date,
  contract_period_months integer not null default 12,
  payment_method text,
  status text not null default 'トライアル' check (status in ('トライアル','有料','停止','解約予定','解約済み')),
  cs_owner_id uuid,
  churn_scheduled_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.product_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  trial_id uuid references public.trials(id) on delete set null,
  period_start date not null,
  period_end date not null,
  last_login_at timestamptz,
  login_count integer not null default 0,
  documents_created integer not null default 0,
  estimates_created integer not null default 0,
  invoices_created integer not null default 0,
  active_users_count integer not null default 0,
  setup_completion_rate integer not null default 0 check (setup_completion_rate between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  description text,
  priority text not null default '中' check (priority in ('低','中','高','緊急')),
  status text not null default '未対応' check (status in ('未対応','対応中','顧客確認中','解決済み','クローズ')),
  type text not null default '使い方' check (type in ('バグ','使い方','要望','請求','クレーム','その他')),
  assigned_to uuid,
  opened_at timestamptz not null default now(),
  last_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

alter table public.tasks
  add constraint tasks_support_ticket_id_fkey foreign key (support_ticket_id) references public.support_tickets(id) on delete set null;

create table public.health_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  measured_on date not null default current_date,
  login_frequency_score integer not null default 0 check (login_frequency_score between 0 and 20),
  document_count_score integer not null default 0 check (document_count_score between 0 and 25),
  active_users_score integer not null default 0 check (active_users_score between 0 and 15),
  setup_score integer not null default 0 check (setup_score between 0 and 10),
  support_score integer not null default 0 check (support_score between 0 and 10),
  renewal_score integer not null default 0 check (renewal_score between 0 and 10),
  cs_subjective_score integer not null default 5 check (cs_subjective_score between 0 and 10),
  total_score integer not null default 0 check (total_score between 0 and 100),
  health_status text not null default '普通' check (health_status in ('健全','普通','注意','危険')),
  churn_risk text not null default '低' check (churn_risk in ('低','中','高')),
  upsell_candidate boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.billing_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  billing_month date not null,
  amount numeric(12,0) not null default 0,
  status text not null default '未請求' check (status in ('未請求','請求済み','入金済み','遅延','取消')),
  due_on date,
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table public.lead_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique (lead_id, tag_id)
);

create table public.company_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique (company_id, tag_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  table_name text not null,
  record_id uuid,
  action text not null,
  actor_id uuid,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create index companies_org_idx on public.companies (organization_id, deleted_at, name);
create index leads_org_idx on public.leads (organization_id, deleted_at, status, next_action_date);
create index contacts_company_idx on public.contacts (organization_id, company_id, deleted_at);
create index deals_org_stage_idx on public.deals (organization_id, deleted_at, stage, expected_contract_date);
create index activities_related_idx on public.activities (organization_id, lead_id, company_id, contact_id, deal_id, occurred_at);
create index tasks_due_idx on public.tasks (organization_id, deleted_at, status, due_date, priority);
create index trials_dates_idx on public.trials (organization_id, deleted_at, start_date, end_date);
create index subscriptions_status_idx on public.subscriptions (organization_id, deleted_at, status, renewal_on);
create index product_usage_company_idx on public.product_usage (organization_id, company_id, period_end);
create index support_tickets_status_idx on public.support_tickets (organization_id, deleted_at, status, priority, opened_at);
create index health_scores_company_idx on public.health_scores (organization_id, company_id, measured_on desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_expected_arr()
returns trigger
language plpgsql
as $$
begin
  new.expected_arr = coalesce(new.expected_mrr, 0) * 12;
  return new;
end;
$$;

create or replace function public.set_subscription_arr()
returns trigger
language plpgsql
as $$
begin
  new.arr = coalesce(new.mrr, 0) * 12;
  return new;
end;
$$;

create or replace function public.set_health_score_total()
returns trigger
language plpgsql
as $$
begin
  new.total_score =
    coalesce(new.login_frequency_score, 0) +
    coalesce(new.document_count_score, 0) +
    coalesce(new.active_users_score, 0) +
    coalesce(new.setup_score, 0) +
    coalesce(new.support_score, 0) +
    coalesce(new.renewal_score, 0) +
    coalesce(new.cs_subjective_score, 0);

  new.health_status = case
    when new.total_score >= 80 then '健全'
    when new.total_score >= 60 then '普通'
    when new.total_score >= 40 then '注意'
    else '危険'
  end;

  new.churn_risk = case
    when new.total_score < 40 then '高'
    when new.total_score < 60 then '中'
    else '低'
  end;

  return new;
end;
$$;

create or replace function public.record_deal_stage_history()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.deal_stage_history (
      organization_id, deal_id, from_stage, to_stage, changed_by, created_by
    )
    values (new.organization_id, new.id, null, new.stage, auth.uid(), auth.uid());
  elsif old.stage is distinct from new.stage then
    insert into public.deal_stage_history (
      organization_id, deal_id, from_stage, to_stage, changed_by, created_by
    )
    values (new.organization_id, new.id, old.stage, new.stage, auth.uid(), auth.uid());
  end if;

  return new;
end;
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
as $$
declare
  v_organization_id uuid;
  v_record_id uuid;
begin
  if tg_op = 'DELETE' then
    v_organization_id = old.organization_id;
    v_record_id = old.id;
  else
    v_organization_id = new.organization_id;
    v_record_id = new.id;
  end if;

  insert into public.audit_logs (
    organization_id,
    table_name,
    record_id,
    action,
    actor_id,
    changes,
    created_by
  )
  values (
    v_organization_id,
    tg_table_name,
    v_record_id,
    tg_op,
    auth.uid(),
    case
      when tg_op = 'DELETE' then jsonb_build_object('old', to_jsonb(old), 'new', null)
      when tg_op = 'INSERT' then jsonb_build_object('old', null, 'new', to_jsonb(new))
      else jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
    end,
    auth.uid()
  );

  return null;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations','profiles','organization_members','tags','companies','leads',
    'contacts','deals','deal_stage_history','activities','tasks','trials',
    'subscriptions','product_usage','support_tickets','health_scores',
    'billing_records','lead_tags','company_tags','audit_logs'
  ]
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create trigger deals_set_expected_arr
before insert or update of expected_mrr on public.deals
for each row execute function public.set_expected_arr();

create trigger subscriptions_set_arr
before insert or update of mrr on public.subscriptions
for each row execute function public.set_subscription_arr();

create trigger health_scores_set_total
before insert or update on public.health_scores
for each row execute function public.set_health_score_total();

create trigger deals_stage_history_insert
after insert or update of stage on public.deals
for each row execute function public.record_deal_stage_history();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tags','companies','leads','contacts','deals','activities','tasks','trials',
    'subscriptions','product_usage','support_tickets','health_scores',
    'billing_records','lead_tags','company_tags'
  ]
  loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.write_audit_log()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
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

create or replace function public.current_user_role(target_organization_id uuid)
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

create or replace function public.ensure_user_profile(default_org_name text default null)
returns table(organization_id uuid, profile_id uuid, role text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_org_id uuid;
  v_role text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  select m.organization_id, m.role
    into v_org_id, v_role
  from public.organization_members m
  where m.user_id = v_user_id
    and m.deleted_at is null
  order by m.created_at asc
  limit 1;

  if v_org_id is null then
    insert into public.organizations (name, created_by, updated_by)
    values (coalesce(nullif(default_org_name, ''), 'デモ組織'), v_user_id, v_user_id)
    returning id into v_org_id;

    insert into public.organization_members (organization_id, user_id, role, created_by, updated_by)
    values (v_org_id, v_user_id, 'admin', v_user_id, v_user_id);

    v_role := 'admin';
  end if;

  insert into public.profiles (id, organization_id, email, full_name, role, created_by, updated_by)
  values (v_user_id, v_org_id, v_email, split_part(coalesce(v_email, '管理者'), '@', 1), v_role, v_user_id, v_user_id)
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        email = excluded.email,
        role = excluded.role,
        updated_by = excluded.updated_by,
        updated_at = now();

  return query select v_org_id, v_user_id, v_role;
end;
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.current_user_role(uuid) from public;
revoke all on function public.ensure_user_profile(text) from public;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.current_user_role(uuid) to authenticated;
grant execute on function public.ensure_user_profile(text) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;

create policy organizations_select_members
on public.organizations for select
to authenticated
using (public.is_organization_member(id));

create policy organizations_insert_own
on public.organizations for insert
to authenticated
with check (created_by = auth.uid());

create policy organizations_update_members
on public.organizations for update
to authenticated
using (public.is_organization_member(id))
with check (public.is_organization_member(id));

create policy profiles_select_same_org_or_self
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_organization_member(organization_id));

create policy profiles_insert_self
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy organization_members_select_org_or_self
on public.organization_members for select
to authenticated
using (user_id = auth.uid() or public.is_organization_member(organization_id));

create policy organization_members_insert_admin
on public.organization_members for insert
to authenticated
with check (public.current_user_role(organization_id) = 'admin');

create policy organization_members_update_admin
on public.organization_members for update
to authenticated
using (public.current_user_role(organization_id) = 'admin')
with check (public.current_user_role(organization_id) = 'admin');

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tags','companies','leads','contacts','deals','deal_stage_history',
    'activities','tasks','trials','subscriptions','product_usage',
    'support_tickets','health_scores','billing_records','lead_tags',
    'company_tags','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I_org_select on public.%I for select to authenticated using (public.is_organization_member(organization_id))', table_name, table_name);
    execute format('create policy %I_org_insert on public.%I for insert to authenticated with check (public.is_organization_member(organization_id))', table_name, table_name);
    execute format('create policy %I_org_update on public.%I for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id))', table_name, table_name);
    execute format('create policy %I_org_delete on public.%I for delete to authenticated using (public.is_organization_member(organization_id))', table_name, table_name);
  end loop;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
grant usage, select on sequences to authenticated;
