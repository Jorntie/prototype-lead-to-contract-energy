"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void;
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, indeterminate, checked, onChange, disabled, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      const el = (ref as React.RefObject<HTMLInputElement>)?.current ?? internalRef.current;
      if (el) {
        el.indeterminate = indeterminate ?? false;
      }
    }, [indeterminate, ref]);

    return (
      <input
        type="checkbox"
        role="checkbox"
        ref={ref ?? internalRef}
        checked={checked}
        disabled={disabled}
        className={cn(
          "h-4 w-4 shrink-0 rounded border border-[var(--input)] bg-transparent shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 accent-[var(--primary)] cursor-pointer",
          className
        )}
        onChange={(e) => {
          onChange?.(e);
          onCheckedChange?.(e.target.checked);
        }}
        {...props}
      />
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
