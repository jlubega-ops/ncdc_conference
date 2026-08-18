"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { AdminListFilters } from "./AdminListFilters";
import { formatAdminDate, UserCell } from "./AdminTabShell";
import { PaperSubmissionReviewModal } from "./PaperSubmissionReviewModal";
import { PAPER_STATUS_LABELS, PAPER_STATUS_STYLES } from "@/lib/papers/constants";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TablePagination } from "@/components/ui/TablePagination";
import { paginateRows } from "@/lib/table/paginate";
import { downloadCsv } from "@/lib/csv/download";

const STATUS_OPTIONS = Object.entries(PAPER_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/**
 * @param {{ conferenceId: string; canAssignReviewer?: boolean }} props
 */
export function ConferenceAdminSubmissionsTab({
  conferenceId,
  canAssignReviewer = true,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      const text = [
        row.title,
        row.user?.email,
        row.user?.name,
        row.status,
        row.assignedReviewer?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [submissions, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const paged = useMemo(() => paginateRows(filtered, page, 25), [filtered, page]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/submissions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load submissions.");
      setSubmissions(data.submissions ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load submissions.");
      if (!silent) setSubmissions([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  function openRow(row) {
    setSelected(row);
  }

  async function handleUpdated() {
    await load({ silent: true });
  }

  function exportSubmissions() {
    downloadCsv(
      "submissions.csv",
      ["Title", "Author", "Email", "Status", "Reviewer", "Submitted"],
      filtered.map((row) => [
        row.title || "",
        row.user?.name || "",
        row.user?.email || "",
        PAPER_STATUS_LABELS[row.status] ?? row.status,
        row.assignedReviewer?.email || "",
        row.submittedAt || row.createdAt || "",
      ]),
    );
  }

  if (loading && submissions.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading submissions…</p>;
  }

  if (error && submissions.length === 0) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (submissions.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
        No paper submissions for this conference yet.
      </p>
    );
  }

  return (
    <>
      <AdminListFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={STATUS_OPTIONS}
        searchPlaceholder="Search papers…"
        trailing={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportSubmissions}
            disabled={filtered.length === 0}
          >
            <Icon icon={FileSpreadsheet} size="sm" />
            Export
          </Button>
        }
      />
      {error ? <p className="mb-3 text-sm text-error">{error}</p> : null}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-neutral-50/80 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No submissions match your filters.
                </td>
              </tr>
            ) : null}
            {paged.rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer transition-colors hover:bg-primary-light/30"
                onClick={() => openRow(row)}
              >
                <UserCell user={row.user} />
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{row.title}</p>
                  {row.isFinalApproved ? (
                    <span className="mt-1 inline-block text-xs font-medium text-primary">
                      Final approval
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                      PAPER_STATUS_STYLES[row.status] ?? PAPER_STATUS_STYLES.DRAFT,
                    )}
                  >
                    {PAPER_STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.assignedReviewer?.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatAdminDate(row.submittedAt || row.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
        start={paged.start}
        end={paged.end}
        onPageChange={setPage}
      />

      <PaperSubmissionReviewModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        submission={selected}
        conferenceId={conferenceId}
        canAssignReviewer={canAssignReviewer}
        onUpdated={handleUpdated}
        onSubmissionChange={(updated) => {
          setSelected(updated);
          setSubmissions((prev) =>
            prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
          );
        }}
      />
    </>
  );
}
