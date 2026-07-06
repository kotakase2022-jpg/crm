import {
  accountingSoftware,
  companySizes,
  constructionIndustries,
  contactRoles,
  dealStages,
  documentMethods,
  issueTags,
  leadSources,
  leadStatuses,
  mainCustomerTypes,
  primaryDevices,
  ticketStatuses,
  ticketTypes,
} from "./options";
import { offsetLocalDateString } from "./format";
import type { CrmRecord, TableName } from "./types";

type DemoStore = Record<TableName, CrmRecord[]>;

const orgId = "demo-org";
const userId = "demo-user";
const companyNames = [
  "青葉工務店",
  "北斗リフォーム",
  "成田内装企画",
  "三島電気工事",
  "水都設備",
  "大川水道サービス",
  "東雲外構",
  "相模解体",
  "匠建設",
  "ひかり住設",
  "旭ホームメンテ",
  "山城建装",
  "藤沢エクステリア",
  "九段設備工業",
  "柏木リノベーション",
];

const personNames = [
  "佐藤 健一",
  "鈴木 真理",
  "高橋 大輔",
  "田中 裕子",
  "伊藤 翔太",
  "渡辺 美咲",
  "山本 一郎",
  "中村 彩",
  "小林 誠",
  "加藤 由美",
];

function id(prefix: string, index: number) {
  return `${prefix}-${String(index).padStart(3, "0")}`;
}

function date(offsetDays: number) {
  return offsetLocalDateString(offsetDays, new Date(2026, 6, 3));
}

function dateTime(offsetDays: number, hour = 10) {
  const value = new Date("2026-07-03T00:00:00.000Z");
  value.setUTCDate(value.getUTCDate() + offsetDays);
  value.setUTCHours(hour, 0, 0, 0);
  return value.toISOString();
}

function base(createdOffset: number): Pick<CrmRecord, "organization_id" | "created_at" | "updated_at" | "created_by" | "updated_by"> {
  return {
    organization_id: orgId,
    created_at: dateTime(createdOffset),
    updated_at: dateTime(createdOffset + 1),
    created_by: userId,
    updated_by: userId,
  };
}

function createCompanies(): CrmRecord[] {
  return companyNames.map((name, index) => {
    const i = index + 1;

    return {
      id: id("company", i),
      ...base(-90 + i),
      name,
      status: i <= 8 ? "customer" : "prospect",
      industry: constructionIndustries[index % constructionIndustries.length],
      company_size: companySizes[index % companySizes.length],
      monthly_projects: 8 + i * 3,
      monthly_documents: 20 + i * 8,
      main_customer_type: mainCustomerTypes[index % mainCustomerTypes.length],
      current_document_method: documentMethods[index % documentMethods.length],
      accounting_software: accountingSoftware[index % accountingSoftware.length],
      primary_device: primaryDevices[index % primaryDevices.length],
      it_literacy: ["高", "中", "低"][index % 3],
      decision_maker_type: ["社長", "経理", "事務長", "現場責任者", "その他"][index % 5],
      prefecture: ["東京都", "神奈川県", "千葉県", "埼玉県", "愛知県"][index % 5],
      phone: `03-0000-${String(i).padStart(4, "0")}`,
      next_action_date: date((i % 9) - 3),
      notes: "帳票運用の標準化と現場共有を重視。",
    };
  });
}

function createContacts(companies: CrmRecord[]): CrmRecord[] {
  return Array.from({ length: 30 }, (_, index) => {
    const i = index + 1;
    const company = companies[index % companies.length];

    return {
      id: id("contact", i),
      ...base(-75 + i),
      company_id: company.id,
      name: `${personNames[index % personNames.length]} ${i}`,
      role: contactRoles[index % contactRoles.length],
      department: ["経営", "総務", "経理", "工事部", "営業"][index % 5],
      email: `contact${i}@example.com`,
      phone: `03-1000-${String(i).padStart(4, "0")}`,
      mobile: `090-2000-${String(i).padStart(4, "0")}`,
      decision_power: ["高", "中", "低"][index % 3],
      notes: "デモ・契約確認の主要窓口。",
    };
  });
}

function createLeads(): CrmRecord[] {
  return Array.from({ length: 20 }, (_, index) => {
    const i = index + 1;

    return {
      id: id("lead", i),
      ...base(-50 + i),
      name: `リード-${String(i).padStart(2, "0")} ${["見積改善", "請求漏れ相談", "Excel脱却", "スマホ運用", "電子帳簿対応"][index % 5]}`,
      company_name: `${["春日建築", "港北リフォーム", "新栄電設", "若葉水道", "南町外構", "本郷内装"][index % 6]}${i}`,
      contact_name: `${["田島", "森", "石井", "原田", "近藤"][index % 5]} 様`,
      email: `lead${i}@example.com`,
      phone: `050-3000-${String(i).padStart(4, "0")}`,
      status: leadStatuses[index % leadStatuses.length],
      source: leadSources[index % leadSources.length],
      issue_tags: [issueTags[index % issueTags.length], issueTags[(index + 2) % issueTags.length]],
      industry: constructionIndustries[index % constructionIndustries.length],
      company_size: companySizes[index % companySizes.length],
      monthly_projects: 3 + i,
      monthly_documents: 10 + i * 5,
      main_customer_type: mainCustomerTypes[index % mainCustomerTypes.length],
      current_document_method: documentMethods[index % documentMethods.length],
      accounting_software: accountingSoftware[index % accountingSoftware.length],
      primary_device: primaryDevices[index % primaryDevices.length],
      it_literacy: ["高", "中", "低"][index % 3],
      decision_maker_type: ["社長", "経理", "事務長", "現場責任者", "その他"][index % 5],
      next_action_date: date((i % 10) - 4),
      notes: "初回接触で現状帳票と意思決定者を確認。",
    };
  });
}

function createDeals(companies: CrmRecord[], contacts: CrmRecord[], leads: CrmRecord[]): CrmRecord[] {
  return Array.from({ length: 20 }, (_, index) => {
    const i = index + 1;
    const expectedMrr = 12000 + i * 3000;
    const stage = dealStages[index % dealStages.length];

    return {
      id: id("deal", i),
      ...base(-45 + i),
      company_id: companies[index % companies.length].id,
      contact_id: contacts[index % contacts.length].id,
      lead_id: leads[index % leads.length].id,
      name: `${companyNames[index % companyNames.length]} 帳票管理導入`,
      stage,
      expected_plan: ["ライト", "スタンダード", "プロ", "エンタープライズ"][index % 4],
      expected_mrr: expectedMrr,
      expected_arr: expectedMrr * 12,
      probability: Math.min(95, 10 + i * 4),
      expected_contract_date: date(i * 5),
      lost_reason: stage === "失注" ? "価格が合わない" : null,
      next_action_date: date((i % 8) - 2),
      notes: "デモでは見積から請求までの一連の流れを確認。",
    };
  });
}

function createTasks(leads: CrmRecord[], deals: CrmRecord[]): CrmRecord[] {
  const titles = ["初回架電", "デモ日程確認", "デモ後フォロー", "トライアル状況確認", "契約確認", "請求確認", "解約リスク確認"];

  return Array.from({ length: 30 }, (_, index) => {
    const i = index + 1;
    const deal = deals[index % deals.length];

    return {
      id: id("task", i),
      ...base(-30 + i),
      title: titles[index % titles.length],
      description: "次回アクションをCRM上で完了管理。",
      status: i % 6 === 0 ? "完了" : "未完了",
      priority: ["低", "中", "高", "緊急"][index % 4],
      due_date: date((i % 14) - 7),
      assignee_id: userId,
      lead_id: i <= leads.length ? leads[i - 1].id : null,
      company_id: deal.company_id,
      deal_id: deal.id,
      automation_key: `demo-task-${i}`,
      completed_at: i % 6 === 0 ? dateTime(-1) : null,
    };
  });
}

function createActivities(leads: CrmRecord[], deals: CrmRecord[]): CrmRecord[] {
  const types = ["電話", "メール", "オンライン商談", "デモ", "訪問", "メモ", "資料送付", "契約関連", "その他"];

  return Array.from({ length: 50 }, (_, index) => {
    const i = index + 1;
    const deal = deals[index % deals.length];

    return {
      id: id("activity", i),
      ...base(-50 + i),
      type: types[index % types.length],
      subject: `活動履歴 ${i}: ${["初回接触", "課題ヒアリング", "デモ実施", "見積提示", "契約確認"][index % 5]}`,
      content: "帳票作成の所要時間、請求漏れ、現場共有の状況を確認。",
      occurred_at: dateTime(-50 + i, 11),
      owner_id: userId,
      lead_id: i <= leads.length ? leads[i - 1].id : null,
      company_id: deal.company_id,
      contact_id: deal.contact_id,
      deal_id: deal.id,
      has_next_action: i % 3 === 0,
      next_action_date: i % 3 === 0 ? date(i % 7) : null,
    };
  });
}

function createTrials(companies: CrmRecord[], deals: CrmRecord[]): CrmRecord[] {
  return Array.from({ length: 8 }, (_, index) => {
    const i = index + 1;
    const company = companies[index];
    const deal = deals.find((item) => item.company_id === company.id) ?? deals[index % deals.length];

    return {
      id: id("trial", i),
      ...base(-24 + i),
      company_id: deal.company_id,
      deal_id: deal.id,
      start_date: date(-(i * 3)),
      end_date: date(21 - i),
      first_login_at: i % 3 === 0 ? null : dateTime(-i),
      login_count: i * 3,
      documents_created: i * 8,
      estimates_created: i * 4,
      invoices_created: Math.max(0, i - 2),
      invited_users_count: i % 5,
      setup_completion_rate: Math.min(100, 20 + i * 10),
      activation_level: Math.min(7, i),
      paid_conversion_likelihood: i >= 6 ? "高" : i <= 2 ? "低" : "中",
      notes: "初期設定と見積書PDF出力までを追跡。",
    };
  });
}

function createContracts(companies: CrmRecord[]): CrmRecord[] {
  return Array.from({ length: 8 }, (_, index) => {
    const i = index + 1;
    const mrr = 18000 + i * 5000;

    return {
      id: id("subscription", i),
      ...base(-300 + i * 15),
      company_id: companies[index].id,
      plan: ["ライト", "スタンダード", "プロ", "エンタープライズ"][index % 4],
      mrr,
      arr: mrr * 12,
      started_on: date(-(i * 40)),
      renewal_on: date(i * 25),
      contract_period_months: 12,
      payment_method: ["クレジットカード", "銀行振込", "口座振替"][index % 3],
      status: i === 7 ? "解約予定" : i === 8 ? "停止" : "有料",
      cs_owner_id: userId,
      churn_scheduled_on: i === 7 ? date(45) : null,
      notes: "契約更新時に利用部門追加の提案余地あり。",
    };
  });
}

function createUsage(companies: CrmRecord[], contracts: CrmRecord[], trials: CrmRecord[]): CrmRecord[] {
  return Array.from({ length: 15 }, (_, index) => {
    const i = index + 1;

    return {
      id: id("usage", i),
      ...base(-15 + i),
      company_id: companies[index].id,
      subscription_id: contracts[index]?.id ?? null,
      trial_id: trials[index]?.id ?? null,
      period_start: "2026-07-01",
      period_end: "2026-07-31",
      last_login_at: [4, 11].includes(i) ? dateTime(-35) : dateTime(-(i % 10)),
      login_count: Math.max(0, 40 - i * 2),
      documents_created: [3, 12].includes(i) ? 0 : i * 9,
      estimates_created: [3, 12].includes(i) ? 0 : i * 4,
      invoices_created: i < 4 ? 0 : i * 2,
      active_users_count: Math.max(1, i % 8),
      setup_completion_rate: Math.min(100, 30 + i * 5),
    };
  });
}

function healthStatus(total: number) {
  if (total >= 80) return "健全";
  if (total >= 60) return "普通";
  if (total >= 40) return "注意";
  return "危険";
}

function createHealthScores(companies: CrmRecord[], usage: CrmRecord[]): CrmRecord[] {
  return companies.map((company, index) => {
    const i = index + 1;
    const currentUsage = usage[index];
    const login = Math.min(20, Math.max(0, Number(currentUsage.login_count ?? 0) / 2));
    const docs = Math.min(25, Math.max(0, Number(currentUsage.documents_created ?? 0) / 4));
    const users = Math.min(15, Math.max(0, Number(currentUsage.active_users_count ?? 0) * 2));
    const setup = Math.min(10, Math.round(Number(currentUsage.setup_completion_rate ?? 0) / 10));
    const support = i % 5 === 0 ? 2 : 8;
    const renewal = i <= 8 ? 8 : 5;
    const subjective = [4, 11, 12].includes(i) ? 2 : 7;
    const total = Math.round(login + docs + users + setup + support + renewal + subjective);

    return {
      id: id("health", i),
      ...base(-10 + i),
      company_id: company.id,
      measured_on: date(0),
      login_frequency_score: Math.round(login),
      document_count_score: Math.round(docs),
      active_users_score: Math.round(users),
      setup_score: setup,
      support_score: support,
      renewal_score: renewal,
      cs_subjective_score: subjective,
      total_score: total,
      health_status: healthStatus(total),
      churn_risk: total < 40 ? "高" : total < 60 ? "中" : "低",
      upsell_candidate: [2, 5, 8, 10].includes(i),
      notes: "利用頻度と問い合わせ状況からCSが確認。",
    };
  });
}

function createTickets(companies: CrmRecord[], contacts: CrmRecord[]): CrmRecord[] {
  const titles = ["PDF出力が崩れる", "見積テンプレート相談", "請求書番号の確認", "スマホ入力の要望", "請求金額の問い合わせ"];

  return Array.from({ length: 15 }, (_, index) => {
    const i = index + 1;

    return {
      id: id("ticket", i),
      ...base(-14 + i),
      company_id: companies[index % companies.length].id,
      contact_id: contacts[index % contacts.length].id,
      title: titles[index % titles.length],
      description: "建設現場での帳票運用に関する問い合わせ。",
      priority: ["低", "中", "高", "緊急"][index % 4],
      status: ticketStatuses[index % ticketStatuses.length],
      type: ticketTypes[index % ticketTypes.length],
      assigned_to: userId,
      opened_at: dateTime(-Math.ceil((i * 9) / 24)),
      last_response_at: i % 4 === 0 ? null : dateTime(-Math.ceil((i * 5) / 24)),
    };
  });
}

function createBilling(companies: CrmRecord[], contracts: CrmRecord[]): CrmRecord[] {
  return Array.from({ length: 12 }, (_, index) => {
    const i = index + 1;

    return {
      id: id("billing", i),
      ...base(-12 + i),
      company_id: companies[index % 8].id,
      subscription_id: contracts[index % contracts.length].id,
      billing_month: `2026-${String(((7 - index + 11) % 12) + 1).padStart(2, "0")}-01`,
      amount: 18000 + i * 5000,
      status: ["未請求", "請求済み", "入金済み", "遅延"][index % 4],
      due_on: date(10 - i),
      paid_on: i % 3 === 0 ? date(-i) : null,
    };
  });
}

function createStageHistory(deals: CrmRecord[]): CrmRecord[] {
  return deals.map((deal, index) => ({
    id: id("stage-history", index + 1),
    ...base(-40 + index),
    deal_id: deal.id,
    from_stage: index % 2 === 0 ? "課題ヒアリング" : "デモ設定",
    to_stage: deal.stage,
    changed_at: dateTime(-20 + index),
    changed_by: userId,
  }));
}

function createStore(): DemoStore {
  const companies = createCompanies();
  const contacts = createContacts(companies);
  const leads = createLeads();
  const deals = createDeals(companies, contacts, leads);
  const tasks = createTasks(leads, deals);
  const activities = createActivities(leads, deals);
  const trials = createTrials(companies, deals);
  const subscriptions = createContracts(companies);
  const usage = createUsage(companies, subscriptions, trials);
  const healthScores = createHealthScores(companies, usage);
  const tickets = createTickets(companies, contacts);
  const billing = createBilling(companies, subscriptions);
  const stageHistory = createStageHistory(deals);

  return {
    leads,
    companies,
    contacts,
    deals,
    activities,
    tasks,
    trials,
    subscriptions,
    product_usage: usage,
    support_tickets: tickets,
    health_scores: healthScores,
    billing_records: billing,
    deal_stage_history: stageHistory,
    lead_import_settings: [],
    lead_import_runs: [],
  };
}

export const demoStore = createStore();

export function getDemoRows(table: TableName) {
  return demoStore[table].filter((record) => !record.deleted_at);
}

export function addDemoRow(table: TableName, record: CrmRecord) {
  demoStore[table].unshift(record);
}

export function updateDemoRow(table: TableName, idValue: string, values: Record<string, unknown>) {
  const rows = demoStore[table];
  const index = rows.findIndex((row) => row.id === idValue);
  if (index === -1) return null;

  rows[index] = {
    ...rows[index],
    ...values,
    updated_at: new Date().toISOString(),
  };

  return rows[index];
}

export function nowIso() {
  return new Date().toISOString();
}

export function newDemoId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
