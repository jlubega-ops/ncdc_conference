"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * @param {{
 *   title: string;
 *   description?: string;
 *   defaultOpen?: boolean;
 *   children: import("react").ReactNode;
 * }} props
 */
export function AdminCollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border bg-background/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Icon
          icon={ChevronDown}
          size="sm"
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      ) : null}
    </div>
  );
}
