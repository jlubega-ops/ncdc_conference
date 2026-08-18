import { cn } from "@/lib/cn";

/**
 * Compact percent / remaining indicator for long-running admin actions.
 * @param {{
 *   current: number;
 *   total: number;
 *   label?: string;
 *   className?: string;
 * }} props
 */
export function ActionProgress({ current, total, label = "Working…", className }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCurrent = Math.min(safeTotal, Math.max(0, Number(current) || 0));
  if (safeTotal <= 0) return null;
  const pct = Math.min(100, Math.round((safeCurrent / safeTotal) * 100));
  const remaining = Math.max(0, safeTotal - safeCurrent);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3 text-sm text-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground/80">
          {pct}% · {remaining} remaining
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-md bg-neutral-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div
          className="h-full bg-primary transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
