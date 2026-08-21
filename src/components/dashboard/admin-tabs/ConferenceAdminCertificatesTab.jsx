"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Download, FileSpreadsheet, Mail } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TablePagination } from "@/components/ui/TablePagination";
import { cn } from "@/lib/cn";
import { paginateRows } from "@/lib/table/paginate";
import { downloadCsv } from "@/lib/csv/download";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatAdminDate } from "./AdminTabShell";
import { AdminListFilters } from "./AdminListFilters";

/**
 * @param {{ conferenceId: string }} props
 */
export function ConferenceAdminCertificatesTab({ conferenceId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [busyKey, setBusyKey] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/certificates`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load certificates.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load certificates.");
      if (!silent) setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const rows = data?.rows ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "issued" && !row.certificate) return false;
      if (statusFilter === "downloaded" && !row.certificate?.downloadedAt) return false;
      if (statusFilter === "emailed" && !row.certificate?.emailedAt) return false;
      if (statusFilter === "eligible" && !row.eligible) return false;
      if (statusFilter === "pending" && (!row.eligible || row.certificate)) return false;

      if (q) {
        const hay = [
          row.name,
          row.email,
          row.certificate?.certificateNumber,
          row.certificate?.recipientName,
          ...(row.roles || []).map((r) => ROLE_LABELS[r] ?? r),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const paged = useMemo(() => paginateRows(filtered, page, 25), [filtered, page]);
  const summary = data?.summary;

  function exportCsv() {
    downloadCsv(
      "certificates.csv",
      [
        "Name",
        "Email",
        "Roles",
        "Eligible",
        "Certificate number",
        "Issued",
        "Downloaded",
        "Emailed",
        "Attendance",
      ],
      filtered.map((row) => [
        row.name || "",
        row.email || "",
        (row.roles || []).map((r) => ROLE_LABELS[r] ?? r).join("; "),
        row.eligible ? "Yes" : "No",
        row.certificate?.certificateNumber || "",
        row.certificate?.issuedAt ? new Date(row.certificate.issuedAt).toISOString() : "",
        row.certificate?.downloadedAt
          ? new Date(row.certificate.downloadedAt).toISOString()
          : "",
        row.certificate?.emailedAt ? new Date(row.certificate.emailedAt).toISOString() : "",
        row.stats
          ? `${row.stats.attended}/${row.stats.totalDays}`
          : "",
      ]),
    );
  }

  async function downloadCertificate(userId, name) {
    setBusyKey(`dl:${userId}`);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/certificates/${userId}/download`,
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Could not download certificate.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `certificate-${name || userId}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificate downloaded.");
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusyKey("");
    }
  }

  async function emailCertificate(userId) {
    setBusyKey(`em:${userId}`);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/certificates/${userId}/email`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not email certificate.");
      toast.success(json.message || "Certificate emailed.");
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Email failed.");
    } finally {
      setBusyKey("");
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Loading certificates…</p>;
  }

  if (error && !data) {
    return <p className="text-sm text-error">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Confirmed", value: summary.confirmed },
            { label: "Eligible", value: summary.eligible },
            { label: "Issued", value: summary.issued },
            { label: "Downloaded", value: summary.downloaded },
            { label: "Emailed", value: summary.emailed },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-md border border-border bg-background px-3 py-2"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <AdminListFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, role, or certificate number…"
        trailing={
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={FileSpreadsheet}
            disabled={filtered.length === 0}
            onClick={exportCsv}
          >
            Export
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "All" },
          { value: "issued", label: "Issued" },
          { value: "downloaded", label: "Downloaded" },
          { value: "emailed", label: "Emailed" },
          { value: "eligible", label: "Eligible" },
          { value: "pending", label: "Eligible — not issued" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-neutral-100 text-muted-foreground hover:bg-neutral-200",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-neutral-50/80 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Certificate</th>
              <th className="px-3 py-2">Downloaded</th>
              <th className="px-3 py-2">Emailed</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {paged.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No attendees match your filters.
                </td>
              </tr>
            ) : (
              paged.rows.map((row) => {
                const downloading = busyKey === `dl:${row.userId}`;
                const emailing = busyKey === `em:${row.userId}`;
                const canAct = row.eligible;
                return (
                  <tr key={row.userId}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                      {row.stats ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Attendance {row.stats.attended}/{row.stats.totalDays}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(row.roles || []).map((role) => (
                          <span
                            key={role}
                            className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary"
                          >
                            {ROLE_LABELS[role] ?? role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {row.certificate ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                          <Icon icon={Award} size="sm" />
                          Issued
                        </span>
                      ) : row.eligible ? (
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                          Eligible
                        </span>
                      ) : (
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-muted-foreground">
                          Not eligible
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.certificate ? (
                        <div>
                          <p className="font-mono text-xs text-foreground">
                            {row.certificate.certificateNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatAdminDate(row.certificate.issuedAt)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {row.certificate?.downloadedAt
                        ? formatAdminDate(row.certificate.downloadedAt)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {row.certificate?.emailedAt
                        ? formatAdminDate(row.certificate.emailedAt)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Download}
                          disabled={!canAct || Boolean(busyKey)}
                          onClick={() => downloadCertificate(row.userId, row.name)}
                        >
                          {downloading ? "…" : "Download"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Mail}
                          disabled={!canAct || Boolean(busyKey)}
                          onClick={() => emailCertificate(row.userId)}
                        >
                          {emailing ? "…" : "Email"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
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
    </div>
  );
}
