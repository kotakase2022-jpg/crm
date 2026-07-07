export const dealStages = [
  "問い合わせ / リード獲得",
  "初回接触",
  "課題ヒアリング",
  "デモ設定",
  "デモ実施",
  "トライアル開始",
  "利用確認中",
  "契約交渉",
  "受注",
  "失注",
] as const;

export const activityTypes = [
  "電話",
  "メール",
  "オンライン商談",
  "デモ",
  "訪問",
  "メモ",
  "資料送付",
  "契約関連",
  "その他",
] as const;

export const contactRoles = [
  "社長",
  "決裁者",
  "事務担当",
  "経理担当",
  "現場責任者",
  "利用者",
  "その他",
] as const;

export const constructionIndustries = [
  "工務店",
  "リフォーム",
  "内装",
  "電気工事",
  "設備工事",
  "水道",
  "外構",
  "解体",
  "その他",
] as const;

export const companySizes = [
  "一人親方",
  "2〜5名",
  "6〜20名",
  "21〜50名",
  "51名以上",
] as const;

export const mainCustomerTypes = [
  "個人施主",
  "法人",
  "元請",
  "下請",
  "管理会社",
  "公共",
] as const;

export const documentMethods = [
  "紙",
  "Excel",
  "Googleスプレッドシート",
  "LINE",
  "既存SaaS",
  "その他",
] as const;

export const accountingSoftware = [
  "freee",
  "マネーフォワード",
  "弥生",
  "TKC",
  "その他",
  "未利用",
] as const;

export const primaryDevices = ["PC中心", "スマホ中心", "タブレット中心"] as const;
export const literacyLevels = ["高", "中", "低"] as const;
export const decisionMakerTypes = ["社長", "経理", "事務長", "現場責任者", "その他"] as const;

export const issueTags = [
  "見積作成が遅い",
  "帳票フォーマットがバラバラ",
  "請求漏れがある",
  "事務負担が大きい",
  "現場との連携が弱い",
  "原価管理が弱い",
  "スマホ対応が必要",
  "インボイス/電子帳簿保存法対応",
  "Excelから脱却したい",
  "社長しか状況を把握していない",
  "その他",
] as const;

export const leadStatuses = ["未設定", "新規（広告経由）", "新規（広告以外）", "未接触", "接触済み", "商談化", "失注"] as const;
export const leadSources = ["Web問い合わせ", "紹介", "展示会", "資料DL", "広告", "既存顧客紹介", "その他"] as const;
export const companyStatuses = ["prospect", "customer", "churned"] as const;
export const companyStatusLabels: Record<(typeof companyStatuses)[number], string> = {
  prospect: "見込み",
  customer: "顧客",
  churned: "解約済み",
};
export const taskStatuses = ["未完了", "完了"] as const;
export const priorities = ["低", "中", "高", "緊急"] as const;
export const trialLikelihood = ["低", "中", "高"] as const;
export const contractStatuses = ["トライアル", "有料", "停止", "解約予定", "解約済み"] as const;
export const paymentMethods = ["クレジットカード", "銀行振込", "口座振替", "その他"] as const;
export const ticketTypes = ["バグ", "使い方", "要望", "請求", "クレーム", "その他"] as const;
export const ticketStatuses = ["未対応", "対応中", "顧客確認中", "解決済み", "クローズ"] as const;
export const healthStatuses = ["健全", "普通", "注意", "危険"] as const;
export const churnRisks = ["低", "中", "高"] as const;

export const roles = [
  "admin",
  "sales_manager",
  "sales",
  "cs_manager",
  "cs",
  "support",
  "finance",
  "viewer",
] as const;

export const roleLabels: Record<(typeof roles)[number], string> = {
  admin: "管理者",
  sales_manager: "営業責任者",
  sales: "営業担当",
  cs_manager: "CS責任者",
  cs: "CS担当",
  support: "サポート",
  finance: "経理担当",
  viewer: "閲覧のみ",
};

export const activationLevels: Record<number, string> = {
  0: "未アクティベーション",
  1: "Lv1: 初回ログイン済み",
  2: "Lv2: 会社情報登録済み",
  3: "Lv3: 顧客1件登録済み",
  4: "Lv4: 見積書1件作成済み",
  5: "Lv5: 見積書PDF出力または送付済み",
  6: "Lv6: 請求書1件作成済み",
  7: "Lv7: 社内メンバー招待済み",
};
