"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3" />}
          {item.href && index < items.length - 1 ? (
            <Link
              href={item.href}
              className="hover:text-[var(--foreground)] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={index === items.length - 1 ? "text-[var(--foreground)] font-medium" : ""}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
