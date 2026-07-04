import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PermissionNotice({ action }: { action: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-40 flex-col items-center justify-center text-center">
        <ShieldAlert className="h-8 w-8 text-slate-500" aria-hidden />
        <h3 className="mt-3 text-base font-semibold text-slate-950">この権限では{action}できません</h3>
        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
          閲覧は可能です。操作が必要な場合は、管理者または担当責任者に権限変更を依頼してください。
        </p>
      </CardContent>
    </Card>
  );
}
