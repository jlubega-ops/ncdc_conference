"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PaperSubmissionReviewModal } from "@/components/dashboard/admin-tabs/PaperSubmissionReviewModal";
import { formatAdminDate } from "@/components/dashboard/admin-tabs/AdminTabShell";
import { PAPER_STATUS_LABELS, PAPER_STATUS_STYLES } from "@/lib/papers/constants";
import { cn } from "@/lib/cn";
import { TablePagination } from "@/components/ui/TablePagination";
import { paginateRows } from "@/lib/table/paginate";

export function ReviewerAssignedPapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return papers;
    return papers.filter((row) => {
      const text = [row.title, row.conference?.title, row.user?.email, row.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [papers, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paged = useMemo(() => paginateRows(filtered, page, 25), [filtered, page]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await fetch("/api/me/reviewer/papers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load assigned papers.");
      setPapers(data.papers ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load assigned papers.");
      if (!silent) setPapers([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdated() {
    await load({ silent: true });
  }

  if (loading && papers.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading assigned papers…</p>;
  }

  if (error && papers.length === 0) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (papers.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        No papers have been assigned to you yet.
      </p>
    );
  }

  return (
    <>
      <input
        type="search"
        placeholder="Search assigned papers…"
        className="mb-4 w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-neutral-50/80 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Conference</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {paged.rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer transition-colors hover:bg-primary-light/30"
                onClick={() => setSelected(row)}
              >
                <td className="px-4 py-3 text-foreground">{row.conference?.title ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{row.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.user?.email ?? "—"}</td>
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
        conferenceId={selected?.conference?.id ?? ""}
        canAssignReviewer={false}
        onUpdated={handleUpdated}
        onSubmissionChange={(updated) => {
          setSelected(updated);
          setPapers((prev) =>
            prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
          );
        }}
      />
    </>
  );
}
