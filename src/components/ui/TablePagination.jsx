"use client";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

/**
 * Compact pager for client-side tables.
 * @param {{
 *   page: number;
 *   totalPages: number;
 *   total: number;
 *   start: number;
 *   end: number;
 *   onPageChange: (page: number) => void;
 *   className?: string;
 * }} props
 */
export function TablePagination({
  page,
  totalPages,
  total,
  start,
  end,
  onPageChange,
  className,
}) {
  if (total <= 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 pt-2 text-sm text-foreground/80",
        className,
      )}
    >
      <p>
        Showing{" "}
        <span className="tabular-nums font-medium text-foreground">
          {start}–{end}
        </span>{" "}
        of <span className="tabular-nums font-medium text-foreground">{total}</span>
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="px-2 tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
