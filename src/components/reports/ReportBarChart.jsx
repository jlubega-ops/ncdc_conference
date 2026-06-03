"use client";

import { CHART_COLORS } from "@/lib/reports/charts";
import { cn } from "@/lib/cn";

/**
 * @param {{
 *   title: string;
 *   subtitle?: string;
 *   items: Array<{ label: string; value: number }>;
 *   className?: string;
 *   vertical?: boolean;
 * }} props
 */
export function ReportBarChart({ title, subtitle, items, className, vertical = false }) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5 shadow-sm", className)}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">No data for this view.</p>
      ) : vertical ? (
        <div className="mt-6 flex h-40 items-end justify-between gap-2">
          {items.map((item, i) => (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-semibold text-foreground">{item.value}</span>
              <div
                className="w-full max-w-[2.5rem] rounded-t-md transition-all"
                style={{
                  height: `${Math.max(8, (item.value / max) * 100)}%`,
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
              <span className="max-w-full truncate text-[10px] text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((item, i) => (
            <li key={item.label}>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span className="truncate text-foreground">{item.label}</span>
                <span className="shrink-0 font-semibold text-foreground">{item.value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(item.value / max) * 100}%`,
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
