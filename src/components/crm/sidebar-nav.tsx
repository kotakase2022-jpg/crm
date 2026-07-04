"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileSignature,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Rocket,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/leads", label: "リード", icon: Sparkles },
  { href: "/companies", label: "会社", icon: Building2 },
  { href: "/contacts", label: "担当者", icon: Users },
  { href: "/deals", label: "商談", icon: Handshake },
  { href: "/tasks", label: "タスク", icon: ListChecks },
  { href: "/trials", label: "トライアル", icon: Rocket },
  { href: "/contracts", label: "契約", icon: FileSignature },
  { href: "/tickets", label: "チケット", icon: LifeBuoy },
  { href: "/reports", label: "レポート", icon: BarChart3 },
  { href: "/settings", label: "設定", icon: Settings },
];

export function SidebarNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex gap-1", compact ? "overflow-x-auto px-4 py-2" : "flex-col")}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
              compact && "shrink-0",
              active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
