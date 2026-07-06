"use client";

import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const messages: Record<string, string> = {
  created: "作成しました。",
  updated: "更新しました。",
  deleted: "削除しました。",
  completed: "タスクを完了しました。",
  reopened: "タスクを未完了に戻しました。",
  converted: "リードを会社・担当者・商談へ変換しました。",
  activity: "活動履歴を追加しました。",
  automation: "自動タスク生成を実行しました。",
  "settings-saved": "スプレッドシート取込設定を保存しました。",
  "settings-error": "スプレッドシート取込設定を保存できませんでした。Googleスプレッドシートの共有URLまたは公開CSV URLを確認してください。",
  "import-success": "スプレッドシートからリードを取り込みました。",
  "import-failed": "スプレッドシート取込に失敗しました。",
  "validation-error": "入力内容に誤りがあります。入力した項目を確認して、もう一度保存してください。",
  demo: "Supabase未設定のためローカルデモデータで表示しています。",
};

const errorToasts = new Set(["settings-error", "validation-error", "import-failed"]);

export function ToastNotice() {
  const params = useSearchParams();
  const toast = params.get("toast");
  const count = params.get("count");

  if (!toast) return null;

  const isError = errorToasts.has(toast);
  const Icon = isError ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={`fixed right-4 top-20 z-50 flex max-w-sm items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm text-slate-700 shadow-lg ${
        isError ? "border-rose-200" : "border-emerald-200"
      }`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      data-testid="toast-notice"
    >
      <Icon className={`h-5 w-5 ${isError ? "text-rose-600" : "text-emerald-600"}`} aria-hidden />
      <span>{toast === "automation" && count ? `${count}件の自動タスクを作成しました。` : messages[toast] ?? "処理が完了しました。"}</span>
    </div>
  );
}
