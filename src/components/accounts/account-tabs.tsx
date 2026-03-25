"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "contacts", label: "Contacts" },
  { key: "sites", label: "Sites" },
  { key: "site-groups", label: "Site Groups" },
  { key: "opportunities", label: "Opportunities" },
  { key: "activity", label: "Activity" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface AccountTabsProps {
  children: Record<TabKey, React.ReactNode>;
}

export function AccountTabs({ children }: AccountTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "overview";

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  return (
    <div>
      <div className="border-b">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:text-[var(--foreground)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {children[activeTab]}
      </div>
    </div>
  );
}
