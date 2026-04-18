import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)]">
          <Icon className="h-6 w-6 text-[var(--muted-foreground)]" />
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-sm">
          {description}
        </p>
      )}
      {actionLabel && (
        <div className="mt-6">
          {actionHref ? (
            <a href={actionHref}>
              <Button>{actionLabel}</Button>
            </a>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
        </div>
      )}
    </div>
  );
}
