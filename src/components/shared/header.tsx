"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  userName?: string;
  userRole?: string;
  notificationCount?: number;
}

export function Header({ userName = "User", userRole = "Sales Rep", notificationCount = 0 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-[var(--background)]/95 backdrop-blur px-6">
      <div />

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--destructive)] text-[10px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </Button>

        {/* User info */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold">
            {userName.split(" ").map((n) => n[0]).join("").toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium">{userName}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
