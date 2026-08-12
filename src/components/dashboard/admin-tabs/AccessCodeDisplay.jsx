"use client";

import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * @param {{ code?: string | null; className?: string; compact?: boolean }} props
 */
export function AccessCodeDisplay({
  code,
  className,
  compact = false,
  issued = false,
  sent = false,
}) {
  const [revealed, setRevealed] = useState(false);
  if (!code) {
    return (
      <span className={cn("text-xs text-amber-800", className)}>Not sent</span>
    );
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Access code copied.");
    } catch {
      toast.error("Could not copy access code.");
    }
  }

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <code
        className={cn(
          "rounded border border-border bg-neutral-50 px-1.5 py-0.5 font-mono tracking-wider text-foreground",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {revealed ? code : "••••"}
      </code>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-primary-light hover:text-primary"
        aria-label={revealed ? "Hide access code" : "View access code"}
        onClick={(e) => {
          e.stopPropagation();
          setRevealed((v) => !v);
        }}
      >
        <Icon icon={revealed ? EyeOff : Eye} size="sm" />
      </button>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-primary-light hover:text-primary"
        aria-label="Copy access code"
        onClick={(e) => {
          e.stopPropagation();
          copyCode();
        }}
      >
        <Icon icon={Copy} size="sm" />
      </button>
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          sent ? "bg-primary-light text-primary" : "bg-amber-50 text-amber-800",
        )}
      >
        {sent ? "Sent" : "Not sent"}
      </span>
    </div>
  );
}
