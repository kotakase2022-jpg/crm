do $$
declare
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_user uuid := '00000000-0000-0000-0000-0000000000aa';
  company_ids uuid[];
  contact_ids uuid[];
  lead_ids uuid[];
  deal_ids uuid[];
  trial_ids uuid[];
  subscription_ids uuid[];
  ticket_ids uuid[];
  issue_tags text[] := array[
    '見積作成が遅い','帳票フォーマットがバラバラ','請求漏れがある','事務負担が大きい',
    '現場との連携が弱い','原価管理が弱い','スマホ対応が必要','インボイス/電子帳簿保存法対応',
    'Excelから脱却したい','社長しか状況を把握していない','その他'
  ];
  company_names text[] := array[
    '青葉工務店','北斗リフォーム','成田内装企画','三島電気工事','水都設備',
    '大川水道サービス','東雲外構','相模解体','匠建設','ひかり住設',
    '旭ホームメンテ','山城建装','藤沢エクステリア','九段設備工業','柏木リノベーション'
  ];
  industries text[] := array['工務店','リフォーム','内装','電気工事','設備工事','水道','外構','解体','その他'];
  sizes text[] := array['一人親方','2〜5名','6〜20名','21〜50名','51名以上'];
  customers text[] := array['個人施主','法人','元請','下請','管理会社','公共'];
  methods text[] := array['紙','Excel','Googleスプレッドシート','LINE','既存SaaS','その他'];
  stages text[] := array[
    '問い合わせ / リード獲得','初回接触','課題ヒアリング','デモ設定','デモ実施',
    'トライアル開始','利用確認中','契約交渉','受注','失注'
  ];
  i integer;
  j integer;
  v_deal_index integer;
  v_company uuid;
  v_contact uuid;
  v_deal uuid;
  v_lead uuid;
  v_ticket uuid;
begin
  insert into public.organizations (id, name, slug, created_by, updated_by)
  values (v_org, '建設帳票CRM デモ組織', 'construction-crm-demo', v_user, v_user)
  on conflict (id) do nothing;

  insert into public.profiles (id, organization_id, email, full_name, role, created_by, updated_by)
  values (v_user, v_org, 'admin@example.com', 'CRM 管理者', 'admin', v_user, v_user)
  on conflict (id) do nothing;

  insert into public.organization_members (organization_id, user_id, role, created_by, updated_by)
  values (v_org, v_user, 'admin', v_user, v_user)
  on conflict (organization_id, user_id) do nothing;

  for i in 1..array_length(issue_tags, 1) loop
    insert into public.tags (organization_id, name, category, color, created_by, updated_by)
    values (v_org, issue_tags[i], 'issue', case when i % 3 = 0 then '#dc2626' when i % 3 = 1 then '#2563eb' else '#059669' end, v_user, v_user)
    on conflict do nothing;
  end loop;

  for i in 1..15 loop
    insert into public.companies (
      organization_id, name, status, industry, company_size, monthly_projects, monthly_documents,
      main_customer_type, current_document_method, accounting_software, primary_device,
      it_literacy, decision_maker_type, prefecture, phone, owner_id, cs_owner_id,
      next_action_date, notes, created_by, updated_by
    )
    values (
      v_org, company_names[i],
      case when i <= 8 then 'customer' else 'prospect' end,
      industries[((i - 1) % array_length(industries, 1)) + 1],
      sizes[((i - 1) % array_length(sizes, 1)) + 1],
      8 + i * 3,
      20 + i * 8,
      customers[((i - 1) % array_length(customers, 1)) + 1],
      methods[((i - 1) % array_length(methods, 1)) + 1],
      (array['freee','マネーフォワード','弥生','TKC','その他','未利用'])[((i - 1) % 6) + 1],
      (array['PC中心','スマホ中心','タブレット中心'])[((i - 1) % 3) + 1],
      (array['高','中','低'])[((i - 1) % 3) + 1],
      (array['社長','経理','事務長','現場責任者','その他'])[((i - 1) % 5) + 1],
      (array['東京都','神奈川県','千葉県','埼玉県','愛知県'])[((i - 1) % 5) + 1],
      '03-0000-' || lpad(i::text, 4, '0'),
      v_user,
      v_user,
      current_date + ((i % 9) - 3),
      '帳票運用の標準化と現場共有を重視。',
      v_user,
      v_user
    )
    returning id into v_company;

    company_ids := array_append(company_ids, v_company);

    insert into public.company_tags (organization_id, company_id, tag_id, created_by, updated_by)
    select v_org, v_company, t.id, v_user, v_user
    from public.tags t
    where t.organization_id = v_org
    order by t.name
    offset (i % 6)
    limit 2;
  end loop;

  for i in 1..30 loop
    v_company := company_ids[((i - 1) % array_length(company_ids, 1)) + 1];

    insert into public.contacts (
      organization_id, company_id, name, role, department, email, phone, mobile,
      decision_power, notes, created_by, updated_by
    )
    values (
      v_org,
      v_company,
      (array['佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村','小林','加藤'])[((i - 1) % 10) + 1] || ' ' ||
        (array['健一','真理','大輔','裕子','翔太','美咲'])[((i - 1) % 6) + 1],
      (array['社長','決裁者','事務担当','経理担当','現場責任者','利用者','その他'])[((i - 1) % 7) + 1],
      (array['経営','総務','経理','工事部','営業'])[((i - 1) % 5) + 1],
      'contact' || i || '@example.com',
      '03-1000-' || lpad(i::text, 4, '0'),
      '090-2000-' || lpad(i::text, 4, '0'),
      case when i % 4 = 0 then '高' when i % 4 = 1 then '中' else '低' end,
      'デモ・契約確認の主要窓口。',
      v_user,
      v_user
    )
    returning id into v_contact;

    contact_ids := array_append(contact_ids, v_contact);
  end loop;

  for i in 1..20 loop
    insert into public.leads (
      organization_id, name, company_name, contact_name, email, phone, status, source,
      issue_tags, industry, company_size, monthly_projects, monthly_documents,
      main_customer_type, current_document_method, accounting_software, primary_device,
      it_literacy, decision_maker_type, owner_id, next_action_date, notes, created_by, updated_by
    )
    values (
      v_org,
      'リード-' || lpad(i::text, 2, '0') || ' ' || (array['見積改善','請求漏れ相談','Excel脱却','スマホ運用','電子帳簿対応'])[((i - 1) % 5) + 1],
      (array['春日建築','港北リフォーム','新栄電設','若葉水道','南町外構','本郷内装'])[((i - 1) % 6) + 1] || i,
      (array['田島','森','石井','原田','近藤'])[((i - 1) % 5) + 1] || ' 様',
      'lead' || i || '@example.com',
      '050-3000-' || lpad(i::text, 4, '0'),
      (array['未設定','新規（広告経由）','新規（広告以外）','未接触','接触済み','商談化','失注'])[((i - 1) % 7) + 1],
      (array['Web問い合わせ','紹介','展示会','資料DL','広告','既存顧客紹介'])[((i - 1) % 6) + 1],
      array[issue_tags[((i - 1) % array_length(issue_tags, 1)) + 1], issue_tags[(i % array_length(issue_tags, 1)) + 1]],
      industries[((i - 1) % array_length(industries, 1)) + 1],
      sizes[((i - 1) % array_length(sizes, 1)) + 1],
      3 + i,
      10 + i * 5,
      customers[((i - 1) % array_length(customers, 1)) + 1],
      methods[((i - 1) % array_length(methods, 1)) + 1],
      (array['freee','マネーフォワード','弥生','未利用'])[((i - 1) % 4) + 1],
      (array['PC中心','スマホ中心','タブレット中心'])[((i - 1) % 3) + 1],
      (array['高','中','低'])[((i - 1) % 3) + 1],
      (array['社長','経理','事務長','現場責任者','その他'])[((i - 1) % 5) + 1],
      v_user,
      current_date + ((i % 10) - 4),
      '初回接触で現状帳票と意思決定者を確認。',
      v_user,
      v_user
    )
    returning id into v_lead;

    lead_ids := array_append(lead_ids, v_lead);
  end loop;

  for i in 1..20 loop
    v_company := company_ids[((i - 1) % array_length(company_ids, 1)) + 1];
    v_contact := contact_ids[((i - 1) % array_length(contact_ids, 1)) + 1];

    insert into public.deals (
      organization_id, company_id, contact_id, lead_id, name, stage, expected_plan,
      expected_mrr, probability, expected_contract_date, lost_reason, owner_id,
      next_action_date, notes, created_by, updated_by
    )
    values (
      v_org,
      v_company,
      v_contact,
      case when i <= array_length(lead_ids, 1) then lead_ids[i] else null end,
      company_names[((i - 1) % array_length(company_names, 1)) + 1] || ' 帳票管理導入',
      stages[((i - 1) % array_length(stages, 1)) + 1],
      (array['ライト','スタンダード','プロ','エンタープライズ'])[((i - 1) % 4) + 1],
      12000 + i * 3000,
      least(95, 10 + i * 4),
      current_date + (i * 5),
      case when ((i - 1) % array_length(stages, 1)) + 1 = 10 then '価格が合わない' else null end,
      v_user,
      current_date + ((i % 8) - 2),
      'デモでは見積から請求までの一連の流れを確認。',
      v_user,
      v_user
    )
    returning id into v_deal;

    deal_ids := array_append(deal_ids, v_deal);
  end loop;

  for i in 1..30 loop
    v_deal_index := ((i - 1) % array_length(deal_ids, 1)) + 1;

    insert into public.tasks (
      organization_id, title, description, status, priority, due_date, assignee_id,
      lead_id, company_id, deal_id, support_ticket_id, automation_key, created_by, updated_by
    )
    values (
      v_org,
      (array['初回架電','デモ日程確認','デモ後フォロー','トライアル状況確認','契約確認','請求確認','解約リスク確認'])[((i - 1) % 7) + 1],
      '次回アクションをCRM上で完了管理。',
      case when i % 6 = 0 then '完了' else '未完了' end,
      (array['低','中','高','緊急'])[((i - 1) % 4) + 1],
      current_date + ((i % 14) - 7),
      v_user,
      case when i <= 20 then lead_ids[i] else null end,
      company_ids[((v_deal_index - 1) % array_length(company_ids, 1)) + 1],
      deal_ids[v_deal_index],
      null,
      'seed-task-' || i,
      v_user,
      v_user
    );
  end loop;

  for i in 1..50 loop
    v_deal_index := ((i - 1) % array_length(deal_ids, 1)) + 1;

    insert into public.activities (
      organization_id, type, subject, content, occurred_at, owner_id,
      lead_id, company_id, contact_id, deal_id, has_next_action, next_action_date,
      created_by, updated_by
    )
    values (
      v_org,
      (array['電話','メール','オンライン商談','デモ','訪問','メモ','資料送付','契約関連','その他'])[((i - 1) % 9) + 1],
      '活動履歴 ' || i || ': ' || (array['初回接触','課題ヒアリング','デモ実施','見積提示','契約確認'])[((i - 1) % 5) + 1],
      '帳票作成の所要時間、請求漏れ、現場共有の状況を確認。',
      now() - ((50 - i) || ' days')::interval,
      v_user,
      case when i <= 20 then lead_ids[i] else null end,
      company_ids[((v_deal_index - 1) % array_length(company_ids, 1)) + 1],
      contact_ids[v_deal_index],
      deal_ids[v_deal_index],
      i % 3 = 0,
      case when i % 3 = 0 then current_date + (i % 7) else null end,
      v_user,
      v_user
    );
  end loop;

  for i in 1..8 loop
    v_deal_index := i;

    insert into public.trials (
      organization_id, company_id, deal_id, start_date, end_date, first_login_at,
      login_count, documents_created, estimates_created, invoices_created,
      invited_users_count, setup_completion_rate, activation_level,
      paid_conversion_likelihood, notes, created_by, updated_by
    )
    values (
      v_org,
      company_ids[i],
      deal_ids[v_deal_index],
      current_date - (i * 3),
      current_date + (21 - i),
      case when i % 3 = 0 then null else now() - (i || ' days')::interval end,
      i * 3,
      i * 8,
      i * 4,
      greatest(0, i - 2),
      i % 5,
      least(100, 20 + i * 10),
      least(7, i),
      case when i >= 6 then '高' when i <= 2 then '低' else '中' end,
      '初期設定と見積書PDF出力までを追跡。',
      v_user,
      v_user
    )
    returning id into v_deal;

    trial_ids := array_append(trial_ids, v_deal);
  end loop;

  for i in 1..8 loop
    insert into public.subscriptions (
      organization_id, company_id, plan, mrr, started_on, renewal_on,
      contract_period_months, payment_method, status, cs_owner_id,
      churn_scheduled_on, notes, created_by, updated_by
    )
    values (
      v_org,
      company_ids[i],
      (array['ライト','スタンダード','プロ','エンタープライズ'])[((i - 1) % 4) + 1],
      18000 + i * 5000,
      current_date - (i * 40),
      current_date + (i * 25),
      12,
      (array['クレジットカード','銀行振込','口座振替'])[((i - 1) % 3) + 1],
      case when i = 7 then '解約予定' when i = 8 then '停止' else '有料' end,
      v_user,
      case when i = 7 then current_date + 45 else null end,
      '契約更新時に利用部門追加の提案余地あり。',
      v_user,
      v_user
    )
    returning id into v_deal;

    subscription_ids := array_append(subscription_ids, v_deal);
  end loop;

  for i in 1..15 loop
    insert into public.product_usage (
      organization_id, company_id, subscription_id, trial_id, period_start, period_end,
      last_login_at, login_count, documents_created, estimates_created, invoices_created,
      active_users_count, setup_completion_rate, created_by, updated_by
    )
    values (
      v_org,
      company_ids[i],
      case when i <= array_length(subscription_ids, 1) then subscription_ids[i] else null end,
      case when i <= array_length(trial_ids, 1) then trial_ids[i] else null end,
      date_trunc('month', current_date)::date,
      (date_trunc('month', current_date) + interval '1 month - 1 day')::date,
      case when i in (4, 11) then now() - interval '35 days' else now() - ((i % 10) || ' days')::interval end,
      greatest(0, 40 - i * 2),
      case when i in (3, 12) then 0 else i * 9 end,
      case when i in (3, 12) then 0 else i * 4 end,
      case when i < 4 then 0 else i * 2 end,
      greatest(1, i % 8),
      least(100, 30 + i * 5),
      v_user,
      v_user
    );
  end loop;

  for i in 1..15 loop
    insert into public.health_scores (
      organization_id, company_id, measured_on, login_frequency_score,
      document_count_score, active_users_score, setup_score, support_score,
      renewal_score, cs_subjective_score, upsell_candidate, notes, created_by, updated_by
    )
    values (
      v_org,
      company_ids[i],
      current_date,
      least(20, greatest(0, 22 - i)),
      least(25, greatest(0, 28 - i * 2)),
      least(15, greatest(0, 16 - i)),
      least(10, 3 + (i % 8)),
      case when i % 5 = 0 then 2 else 8 end,
      case when i <= 8 then 8 else 5 end,
      case when i in (4, 11, 12) then 2 else 7 end,
      i in (2, 5, 8, 10),
      '利用頻度と問い合わせ状況からCSが確認。',
      v_user,
      v_user
    );
  end loop;

  for i in 1..15 loop
    v_company := company_ids[((i - 1) % array_length(company_ids, 1)) + 1];
    v_contact := contact_ids[((i - 1) % array_length(contact_ids, 1)) + 1];

    insert into public.support_tickets (
      organization_id, company_id, contact_id, title, description, priority,
      status, type, assigned_to, opened_at, last_response_at, created_by, updated_by
    )
    values (
      v_org,
      v_company,
      v_contact,
      (array['PDF出力が崩れる','見積テンプレート相談','請求書番号の確認','スマホ入力の要望','請求金額の問い合わせ'])[((i - 1) % 5) + 1],
      '建設現場での帳票運用に関する問い合わせ。',
      (array['低','中','高','緊急'])[((i - 1) % 4) + 1],
      (array['未対応','対応中','顧客確認中','解決済み','クローズ'])[((i - 1) % 5) + 1],
      (array['バグ','使い方','要望','請求','クレーム','その他'])[((i - 1) % 6) + 1],
      v_user,
      now() - ((i * 9) || ' hours')::interval,
      case when i % 4 = 0 then null else now() - ((i * 5) || ' hours')::interval end,
      v_user,
      v_user
    )
    returning id into v_ticket;

    ticket_ids := array_append(ticket_ids, v_ticket);
  end loop;

  for i in 1..12 loop
    insert into public.billing_records (
      organization_id, company_id, subscription_id, billing_month, amount,
      status, due_on, paid_on, created_by, updated_by
    )
    values (
      v_org,
      company_ids[((i - 1) % 8) + 1],
      subscription_ids[((i - 1) % array_length(subscription_ids, 1)) + 1],
      date_trunc('month', current_date - ((i - 1) || ' months')::interval)::date,
      18000 + i * 5000,
      (array['未請求','請求済み','入金済み','遅延'])[((i - 1) % 4) + 1],
      current_date + (10 - i),
      case when i % 3 = 0 then current_date - i else null end,
      v_user,
      v_user
    );
  end loop;
end $$;
