import { HardHat, LogOut } from "lucide-react";
import { signOutAction } from "@/lib/crm/actions";
import { roleLabels } from "@/lib/crm/options";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  role,
  mode,
}: {
  children: React.ReactNode;
  role: string;
  mode: "demo" | "supabase";
}) {
  const roleLabel = role in roleLabels ? roleLabels[role as keyof typeof roleLabels] : role;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
            <HardHat className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold">建設帳票CRM</p>
            <p className="text-xs text-slate-500">Sales / CS Console</p>
          </div>
        </div>
        <SidebarNav />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">{mode === "demo" ? "ローカルデモデータ" : "Supabase 永続化"}</p>
              <h1 className="truncate text-base font-semibold text-slate-950">次に何をすべきかが分かるCRM</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                {roleLabel}
              </span>
              <form action={signOutAction}>
                <Button variant="secondary" className="h-9 px-3" title="ログアウト">
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">ログアウト</span>
                </Button>
              </form>
            </div>
          </div>
          <div className="border-t border-slate-100 lg:hidden">
            <SidebarNav compact />
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
