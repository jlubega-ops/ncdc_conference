"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * @param {{ label: string, emptyMessage: string, conferenceId: string, endpoint: string, renderRow: (item: any) => React.ReactNode, columns: { key: string, label: string, className?: string }[] }} props
 */
export function AdminDataListTab({
  label,
  emptyMessage,
  conferenceId,
  endpoint,
  columns,
  renderRow,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading {label.toLowerCase()}…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
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
          {items.map((item) => renderRow(item))}
        </tbody>
      </table>
    </div>
  );
}

export function formatAdminDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserCell({ user }) {
  return (
    <td className="px-4 py-3">
      <p className="font-medium text-foreground">{user?.name || "—"}</p>
      <p className="text-xs text-muted-foreground">{user?.email || "—"}</p>
    </td>
  );
}
