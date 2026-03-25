"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Users,
  Building2,
  TrendingUp,
  FileText,
  FileSignature,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "My Work",
    items: [
      { label: "My Actions", href: "/actions", icon: ListChecks },
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Leads", href: "/leads", icon: Users },
      { label: "Accounts", href: "/accounts", icon: Building2 },
      { label: "Opportunities", href: "/opportunities", icon: TrendingUp },
      { label: "Quotes", href: "/quotes", icon: FileText },
      { label: "Contracts", href: "/contracts", icon: FileSignature },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Admin", href: "/admin", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r bg-[var(--card)]">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Zap className="h-5 w-5 text-amber-500" />
        <span className="font-bold text-lg">EnergyLTC</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-4 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {group.label}
              </span>
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 mx-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-medium"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-colors cursor-pointer">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
