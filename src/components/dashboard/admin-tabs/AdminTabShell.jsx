"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatAdminDateTime } from "@/lib/conferences/utils";
import { AdminListFilters } from "./AdminListFilters";

/**
 * @param {{
 *   label: string;
 *   emptyMessage: string;
 *   conferenceId: string;
 *   endpoint: string;
 *   renderRow: (item: any) => React.ReactNode;
 *   columns: { key: string; label: string; className?: string }[];
 *   statusOptions?: { value: string; label: string }[];
 *   getSearchText?: (item: any) => string;
 * }} props
 */
export function AdminDataListTab({
  label,
  emptyMessage,
  conferenceId,
  endpoint,
  columns,
  renderRow,
  statusOptions = [],
  getSearchText,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/conferences/${conferenceId}/${endpoint}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Could not load ${label.toLowerCase()}.`);
        const listKey =
          endpoint === "registrations"
            ? "registrations"
            : endpoint === "submissions"
              ? "submissions"
              : "feedback";
        if (!cancelled) setItems(data[listKey] ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : `Could not load ${label.toLowerCase()}.`);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [conferenceId, endpoint, label]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      const text = (getSearchText?.(item) ?? "").toLowerCase();
      return text.includes(q);
    });
  }, [items, search, statusFilter, getSearchText]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading {label.toLowerCase()}…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  return (
    <div>
      <AdminListFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={statusOptions.length ? setStatusFilter : undefined}
        statusOptions={statusOptions}
        searchPlaceholder={`Search ${label.toLowerCase()}…`}
      />
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
          No results match your filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-background">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      col.className,
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {filtered.map((item) => renderRow(item))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function formatAdminDate(value) {
  return formatAdminDateTime(value);
}

export function UserCell({ user }) {
  return (
    <td className="px-4 py-3">
      <p className="font-medium text-foreground">{user?.name || "—"}</p>
      <p className="text-xs text-muted-foreground">{user?.email || "—"}</p>
    </td>
  );
}
