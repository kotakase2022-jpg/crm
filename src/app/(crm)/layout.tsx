import { Suspense } from "react";
import { AppShell } from "@/components/crm/app-shell";
import { ToastNotice } from "@/components/crm/toast-notice";
import { getCrmContext } from "@/lib/crm/data";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const context = await getCrmContext();

  return (
    <AppShell role={context.role} mode={context.mode}>
      <Suspense fallback={null}>
        <ToastNotice />
      </Suspense>
      {children}
    </AppShell>
  );
}
