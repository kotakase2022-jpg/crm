import { cn } from "@/lib/utils";

const toneMap = {
  default: "border-slate-200 bg-slate-100 text-slate-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  yellow: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  purple: "border-violet-200 bg-violet-50 text-violet-700",
  slate: "border-slate-300 bg-white text-slate-600",
};

export type BadgeTone = keyof typeof toneMap;

export function Badge({ children, tone = "default", className }: { children: React.ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", toneMap[tone], className)}>
      {children}
    </span>
  );
}

export function toneForValue(value: unknown): BadgeTone {
  const text = String(value ?? "");
  if (["受注", "有料", "完了", "健全", "低", "高"].includes(text)) return text === "高" ? "red" : "green";
  if (["危険", "失注", "解約予定", "解約済み", "未対応", "緊急"].includes(text)) return "red";
  if (["注意", "停止", "中", "対応中", "顧客確認中"].includes(text)) return "yellow";
  if (["トライアル", "新規", "未接触", "デモ設定", "デモ実施", "トライアル開始"].includes(text)) return "blue";
  if (["アップセル", "商談化"].includes(text)) return "purple";
  return "default";
}
