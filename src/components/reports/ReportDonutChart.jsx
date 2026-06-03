"use client";

import { buildConicGradient } from "@/lib/reports/charts";
import { cn } from "@/lib/cn";

/**
 * @param {{
 *   title: string;
 *   subtitle?: string;
 *   segments: Array<{ label: string; value: number; color: string }>;
 *   centerLabel?: string;
 *   className?: string;
 * }} props
 */
export function ReportDonutChart({
  title,
  subtitle,
  segments,
  centerLabel,
  className,
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const gradient = buildConicGradient(segments);

  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5 shadow-sm", className)}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}

      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">No data for this view.</p>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div
            className="relative h-36 w-36 shrink-0 rounded-full"
            style={{ background: gradient }}
            role="img"
            aria-label={title}
          >
            <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-surface text-center">
              <span className="text-2xl font-bold text-primary">{total}</span>
              <span className="text-[10px] text-muted-foreground">{centerLabel ?? "total"}</span>
            </div>
          </div>
          <ul className="w-full min-w-0 flex-1 space-y-2">
            {segments.map((seg) => (
              <li key={seg.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate text-foreground">{seg.label}</span>
                </span>
                <span className="shrink-0 font-semibold text-foreground">
                  {seg.value}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({Math.round((seg.value / total) * 100)}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
