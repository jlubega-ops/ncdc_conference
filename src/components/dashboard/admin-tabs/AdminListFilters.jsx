"use client";

const selectClass =
  "h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground";

/**
 * @param {{
 *   search: string;
 *   onSearchChange: (v: string) => void;
 *   statusFilter?: string;
 *   onStatusFilterChange?: (v: string) => void;
 *   statusOptions?: { value: string; label: string }[];
 *   statusAllLabel?: string;
 *   extraSelects?: Array<{
 *     value: string;
 *     onChange: (v: string) => void;
 *     options: { value: string; label: string }[];
 *     allLabel?: string;
 *     ariaLabel?: string;
 *   }>;
 *   searchPlaceholder?: string;
 *   trailing?: React.ReactNode;
 * }} props
 */
export function AdminListFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions = [],
  statusAllLabel = "All statuses",
  extraSelects = [],
  searchPlaceholder = "Search…",
  trailing = null,
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="h-9 min-w-[200px] flex-1 rounded-md border border-border bg-surface px-3 text-sm sm:max-w-sm"
      />
      {statusOptions.length > 0 && onStatusFilterChange ? (
        <select
          value={statusFilter ?? "all"}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="all">{statusAllLabel}</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : null}
      {extraSelects.map((select) => (
        <select
          key={select.ariaLabel ?? select.allLabel}
          value={select.value}
          onChange={(e) => select.onChange(e.target.value)}
          className={selectClass}
          aria-label={select.ariaLabel}
        >
          <option value="all">{select.allLabel ?? "All"}</option>
          {select.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {trailing}
    </div>
  );
}
