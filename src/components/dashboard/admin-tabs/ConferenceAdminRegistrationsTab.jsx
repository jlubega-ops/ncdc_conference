"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminListFilters } from "./AdminListFilters";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { formatAdminDate } from "./AdminTabShell";
import { RegistrationDetailFields } from "./RegistrationDetailFields";

const STATUS_LABELS = {
  PENDING: "Pending",
  NEEDS_REVISION: "Needs revision",
  CONFIRMED: "Approved",
  CANCELLED: "Cancelled",
};

const STATUS_CLASS = {
  PENDING: "bg-neutral-100 text-muted-foreground",
  NEEDS_REVISION: "bg-amber-50 text-amber-800",
  CONFIRMED: "bg-primary-light text-primary",
  CANCELLED: "bg-error/10 text-error",
};

/**
 * @param {{ conferenceId: string }} props
 */
export function ConferenceAdminRegistrationsTab({ conferenceId }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [improvementRequest, setImprovementRequest] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (accountFilter === "active" && !row.accountActivated) return false;
      if (accountFilter === "pending" && row.accountActivated) return false;
      if (!q) return true;
      const text = [
        row.displayName,
        row.user?.email,
        row.institution,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [registrations, search, statusFilter, accountFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/registrations`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load registrations.");
      setRegistrations(data.registrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load registrations.");
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  function openRow(row) {
    setSelected(row);
    setAdminNotes(row.adminNotes ?? "");
    setImprovementRequest("");
    setShowRevisionForm(false);
  }

  function closeModal() {
    setSelected(null);
    setShowRevisionForm(false);
  }

  async function review(action) {
    if (!selected) return;
    if (action === "request_revision" && !improvementRequest.trim()) {
      toast.error("Describe what the applicant should improve.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/registrations/${selected.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            adminNotes: adminNotes.trim() || undefined,
            improvementRequest:
              action === "request_revision" ? improvementRequest.trim() : undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update registration.");
      toast.success(
        action === "approve"
          ? "Registration approved."
          : "Revision request sent.",
      );
      closeModal();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update registration.");
    } finally {
      setBusy(false);
    }
  }

  async function resendActivation() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/registrations/${selected.id}/resend-activation`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resend activation.");
      toast.success(data.message || "Activation email sent.");
      const listRes = await fetch(`/api/admin/conferences/${conferenceId}/registrations`);
      const listData = await listRes.json();
      if (listRes.ok) {
        setRegistrations(listData.registrations ?? []);
        const updated = (listData.registrations ?? []).find((r) => r.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resend activation.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading registrations…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (registrations.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
        No registrations for this conference yet.
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
        statusOptions={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        searchPlaceholder="Search registrations…"
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { value: "all", label: "All accounts" },
          { value: "active", label: "Activated" },
          { value: "pending", label: "Pending activation" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setAccountFilter(opt.value)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium",
              accountFilter === opt.value
                ? "bg-primary text-white"
                : "bg-neutral-100 text-muted-foreground hover:bg-neutral-200",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-neutral-50/80 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Institution</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No registrations match your filters.
                </td>
              </tr>
            ) : null}
            {filtered.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer transition-colors hover:bg-primary-light/30"
                onClick={() => openRow(row)}
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {row.displayName || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.user?.email}</td>
                <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">
                  {row.institution || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                      STATUS_CLASS[row.status] ?? STATUS_CLASS.PENDING,
                    )}
                  >
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      row.accountActivated ? "text-primary" : "text-amber-700",
                    )}
                  >
                    {row.accountActivated ? "Active" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatAdminDate(row.registeredAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={closeModal}
        title={selected?.displayName || selected?.user?.email || "Registration"}
        size="xl"
      >
        {selected ? (
          <div className="space-y-5">
            <RegistrationDetailFields row={selected} />

            {selected.status !== "CONFIRMED" ? (
              <div className="space-y-4 border-t border-border pt-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Note to applicant (optional, included in email)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    placeholder="Optional message…"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>

                {showRevisionForm ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Requested improvements *
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                      placeholder="e.g. Please upload a clearer payment receipt…"
                      value={improvementRequest}
                      onChange={(e) => setImprovementRequest(e.target.value)}
                      autoFocus
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      review("approve");
                    }}
                  >
                    Approve
                  </Button>
                  {!showRevisionForm ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRevisionForm(true);
                      }}
                    >
                      Request improvement
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRevisionForm(false);
                          setImprovementRequest("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          review("request_revision");
                        }}
                      >
                        Send revision request
                      </Button>
                    </>
                  )}
                  {!selected.accountActivated ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={resendActivation}
                      className="ml-auto"
                    >
                      Resend activation email
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="border-t border-border pt-4">
                {selected.adminNotes ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Admin note:</span>{" "}
                    {selected.adminNotes}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">This registration is approved.</p>
                )}
                {!selected.accountActivated ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      resendActivation();
                    }}
                  >
                    Resend activation email
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
