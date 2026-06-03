"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

/**
 * @param {{
 *   open: boolean;
 *   onClose?: () => void;
 *   title: string;
 *   children: import("react").ReactNode;
 *   className?: string;
 *   size?: "md" | "lg" | "xl";
 *   dismissible?: boolean;
 *   zIndex?: number;
 * }} props
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = "lg",
  dismissible = true,
  zIndex = 90,
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const sizeClass =
    size === "xl" ? "max-w-3xl" : size === "md" ? "max-w-md" : "max-w-2xl";

  return (
    <div
      className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={dismissible ? onClose : undefined}
        tabIndex={dismissible ? 0 : -1}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-lg border border-border bg-surface shadow-lg sm:rounded-lg",
          sizeClass,
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h2 id="modal-title" className="text-base font-semibold text-foreground">
            {title}
          </h2>
          {dismissible && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
              aria-label="Close"
            >
              <Icon icon={X} size="md" />
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}
