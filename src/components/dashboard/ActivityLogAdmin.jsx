"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

const ACTION_OPTIONS = Object.values(ACTIVITY_ACTIONS).sort();

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export function ActivityLogAdmin() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [successFilter, setSuccessFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (q.trim()) params.set("q", q.trim());
      if (action) params.set("action", action);
      if (successFilter === "ok") params.set("success", "true");
      if (successFilter === "fail") params.set("success", "false");

      const res = await fetch(`/api/admin/activity-log?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load activity log.");
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load activity log.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, action, successFilter, offset]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Activity log</h1>
        <p className="mt-1 text-sm text-foreground/80">
          System-wide audit trail of authenticated and administrative actions. Visible to system
          administrators only.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            value={q}
            onChange={(e) => {
              setOffset(0);
              setQ(e.target.value);
            }}
            placeholder="Actor, action, description…"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Action</label>
          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={action}
            onChange={(e) => {
              setOffset(0);
              setAction(e.target.value);
            }}
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Result</label>
          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={successFilter}
            onChange={(e) => {
              setOffset(0);
              setSuccessFilter(e.target.value);
            }}
          >
            <option value="all">All</option>
            <option value="ok">Succeeded</option>
            <option value="fail">Failed</option>
          </select>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      <p className="text-sm text-foreground/80">
        Showing {rows.length} of {total} entries
        {offset > 0 ? ` (offset ${offset})` : ""}.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading activity log…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/80">
          No activity recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-foreground/80">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-foreground/80">
                    {formatWhen(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <p className="font-medium">{row.actorName || row.actorEmail || "Anonymous"}</p>
                    {row.actorEmail && row.actorName ? (
                      <p className="text-xs text-foreground/70">{row.actorEmail}</p>
                    ) : null}
                    {row.actorRole ? (
                      <p className="text-xs text-foreground/70">{row.actorRole}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{row.action}</code>
                    {row.resourceType ? (
                      <p className="mt-1 text-xs text-foreground/70">
                        {row.resourceType}
                        {row.resourceId ? `: ${row.resourceId}` : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="max-w-md px-4 py-3 text-foreground/90">{row.description}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        row.success
                          ? "bg-primary-light text-primary"
                          : "bg-red-50 text-error",
                      )}
                    >
                      {row.success ? "OK" : "Failed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={offset <= 0 || loading}
          onClick={() => setOffset((o) => Math.max(0, o - limit))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={offset + limit >= total || loading}
          onClick={() => setOffset((o) => o + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
