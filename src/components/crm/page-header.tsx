import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-normal text-slate-950">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {actionHref && actionLabel ? (
          <Link href={actionHref} className={buttonClassName()}>
            <Plus className="h-4 w-4" aria-hidden />
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
