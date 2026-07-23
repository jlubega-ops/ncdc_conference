"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Trash2, Upload } from "lucide-react";
import { AdminListFilters } from "./AdminListFilters";
import { AttendeeUploadDialog } from "./AttendeeUploadDialog";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
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

function buildEditForm(row) {
  const form = row?.formData ?? {};
  const profile = row?.user?.profileData ?? {};
  return {
    firstName: form.firstName || profile.firstName || "",
    middleName: form.middleName || profile.middleName || "",
    lastName: form.lastName || profile.lastName || "",
    telephone: form.telephone || profile.telephone || "",
    countryCode: form.countryCode || profile.countryCode || "+256",
    institution: form.institution || profile.institution || "",
    countryOfOrigin: form.countryOfOrigin || profile.countryOfOrigin || "",
    gender: form.gender || profile.gender || "",
  };
}

/**
 * @param {{ conferenceId: string; registrationMode?: string }} props
 */
export function ConferenceAdminRegistrationsTab({
  conferenceId,
  registrationMode = "MANUAL_APPROVE",
}) {
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
  const [uploadOpen, setUploadOpen] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(buildEditForm(null));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const isAdminUpload = registrationMode === "ADMIN_UPLOAD";
  const isOpenNoReg = registrationMode === "OPEN_NO_REGISTRATION";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (accountFilter === "active" && !row.accessKeyIssued) return false;
      if (accountFilter === "pending" && row.accessKeyIssued) return false;
      if (!q) return true;
      const text = [row.displayName, row.user?.email, row.institution, row.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [registrations, search, statusFilter, accountFilter]);

  const selectableFiltered = useMemo(
    () => filtered.filter((row) => row.status === "CONFIRMED"),
    [filtered],
  );

  const allSelectableChecked =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((row) => checkedIds.has(row.id));

  const checkedCount = checkedIds.size;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/registrations`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load registrations.");
      setRegistrations(data.registrations ?? []);
      setCheckedIds(new Set());
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
    setEditing(false);
    setEditForm(buildEditForm(row));
  }

  function closeModal() {
    setSelected(null);
    setShowRevisionForm(false);
    setEditing(false);
  }

  function toggleChecked(id) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allSelectableChecked) {
        for (const row of selectableFiltered) next.delete(row.id);
      } else {
        for (const row of selectableFiltered) next.add(row.id);
      }
      return next;
    });
  }

  async function sendAccessCodesForIds(ids) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/registrations/send-access-codes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationIds: ids }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send access codes.");
      if (data.failed?.length) {
        toast.warning(data.message || "Some access codes could not be sent.");
      } else {
        toast.success(data.message || "Access codes emailed.");
      }
      setBulkConfirmOpen(false);
      setCheckedIds(new Set());
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send access codes.");
    } finally {
      setBusy(false);
    }
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
          ? "Registration approved. Access code emailed."
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

  async function resendAccessCode() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/registrations/${selected.id}/resend-activation`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resend access code.");
      toast.success(data.message || "Access code emailed.");
      const listRes = await fetch(`/api/admin/conferences/${conferenceId}/registrations`);
      const listData = await listRes.json();
      if (listRes.ok) {
        setRegistrations(listData.registrations ?? []);
        const updated = (listData.registrations ?? []).find((r) => r.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resend access code.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/registrations/${selected.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formData: editForm }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update details.");
      toast.success(data.message || "Details updated.");
      setEditing(false);
      await load();
      if (data.registration) setSelected(data.registration);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update details.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteRegistration() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/registrations/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: deleteConfirm }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete registration.");
      toast.success(data.message || "Registration removed.");
      setDeleteTarget(null);
      setDeleteConfirm("");
      if (selected?.id === deleteTarget.id) closeModal();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete registration.");
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

  return (
    <>
      {isOpenNoReg ? (
        <p className="mb-4 rounded-md border border-border bg-neutral-50 px-3 py-2 text-sm text-foreground/80">
          This conference is open with no registration. Attendee lists are not collected here.
        </p>
      ) : null}

      <AdminListFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={Object.entries(STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        searchPlaceholder="Search registrations…"
        trailing={
          isAdminUpload ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Upload}
              onClick={() => setUploadOpen(true)}
            >
              Upload attendees
            </Button>
          ) : null
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[
          { value: "all", label: "All access codes" },
          { value: "active", label: "Code issued" },
          { value: "pending", label: "No code yet" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setAccountFilter(opt.value)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium",
              accountFilter === opt.value
                ? "bg-primary text-white"
                : "bg-neutral-100 text-foreground/80 hover:bg-neutral-200",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {checkedCount > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary-light px-3 py-2.5">
          <p className="text-sm text-foreground">
            <strong>{checkedCount}</strong> selected
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setCheckedIds(new Set())}
            >
              Clear selection
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={KeyRound}
              disabled={busy}
              onClick={() => setBulkConfirmOpen(true)}
            >
              Send access codes
            </Button>
          </div>
        </div>
      ) : null}

      {registrations.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-foreground/80">
          {isAdminUpload
            ? "No attendees yet. Upload a CSV list to add people and email access codes."
            : "No registrations for this conference yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-neutral-50/80 text-xs font-medium text-foreground/80">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary"
                    checked={allSelectableChecked}
                    disabled={selectableFiltered.length === 0}
                    onChange={toggleSelectAllFiltered}
                    aria-label="Select all approved attendees in this list"
                  />
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Institution</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Access code</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-foreground/80">
                    No registrations match your filters.
                  </td>
                </tr>
              ) : null}
              {filtered.map((row) => {
                const canSelect = row.status === "CONFIRMED";
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors hover:bg-primary-light/30",
                      checkedIds.has(row.id) && "bg-primary-light/40",
                    )}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary disabled:opacity-40"
                        checked={checkedIds.has(row.id)}
                        disabled={!canSelect}
                        onChange={() => toggleChecked(row.id)}
                        aria-label={`Select ${row.displayName || row.user?.email || "attendee"}`}
                        title={
                          canSelect
                            ? "Select to send access code"
                            : "Only approved attendees can receive access codes"
                        }
                      />
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3 font-medium text-foreground"
                      onClick={() => openRow(row)}
                    >
                      {row.displayName || "—"}
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3 text-foreground/80"
                      onClick={() => openRow(row)}
                    >
                      {row.user?.email}
                    </td>
                    <td
                      className="max-w-[180px] cursor-pointer truncate px-4 py-3 text-foreground/80"
                      onClick={() => openRow(row)}
                    >
                      {row.institution || "—"}
                    </td>
                    <td className="cursor-pointer px-4 py-3" onClick={() => openRow(row)}>
                      <span
                        className={cn(
                          "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                          STATUS_CLASS[row.status] ?? STATUS_CLASS.PENDING,
                        )}
                      >
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="cursor-pointer px-4 py-3" onClick={() => openRow(row)}>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          row.accessKeyIssued ? "text-primary" : "text-amber-800",
                        )}
                      >
                        {row.accessKeyIssued ? "Issued" : "Pending"}
                      </span>
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3 text-foreground/80"
                      onClick={() => openRow(row)}
                    >
                      {formatAdminDate(row.registeredAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-nowrap items-center gap-1">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          aria-label={`Edit ${row.displayName || row.user?.email || "registration"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openRow(row);
                            setEditing(true);
                          }}
                        >
                          <Icon icon={Pencil} size="sm" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-error hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
                          aria-label={`Delete ${row.displayName || row.user?.email || "registration"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(row);
                            setDeleteConfirm("");
                          }}
                        >
                          <Icon icon={Trash2} size="sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AttendeeUploadDialog
        conferenceId={conferenceId}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={load}
      />

      <Modal
        open={bulkConfirmOpen}
        onClose={() => !busy && setBulkConfirmOpen(false)}
        title="Send access codes"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            Email a new access code to <strong>{checkedCount}</strong> selected attendee
            {checkedCount === 1 ? "" : "s"}. Any previous code for those people will stop working.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setBulkConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={KeyRound}
              disabled={busy || checkedCount === 0}
              onClick={() => sendAccessCodesForIds([...checkedIds])}
            >
              {busy ? "Sending…" : "Send codes"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(selected)}
        onClose={closeModal}
        title={selected?.displayName || selected?.user?.email || "Registration"}
        size="xl"
      >
        {selected ? (
          <div className="space-y-5">
            {editing ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground/80">
                  Update this registered user’s details for this conference.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="First name"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                  />
                  <Input
                    label="Middle name"
                    value={editForm.middleName}
                    onChange={(e) => setEditForm((p) => ({ ...p, middleName: e.target.value }))}
                  />
                  <Input
                    label="Last name"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                  />
                  <Input
                    label="Gender"
                    value={editForm.gender}
                    onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
                  />
                  <Input
                    label="Country code"
                    value={editForm.countryCode}
                    onChange={(e) => setEditForm((p) => ({ ...p, countryCode: e.target.value }))}
                  />
                  <Input
                    label="Telephone"
                    value={editForm.telephone}
                    onChange={(e) => setEditForm((p) => ({ ...p, telephone: e.target.value }))}
                  />
                  <Input
                    label="Institution"
                    value={editForm.institution}
                    onChange={(e) => setEditForm((p) => ({ ...p, institution: e.target.value }))}
                  />
                  <Input
                    label="Country of origin"
                    value={editForm.countryOfOrigin}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, countryOfOrigin: e.target.value }))
                    }
                  />
                </div>
                <p className="text-sm text-foreground/80">
                  Email: <span className="font-medium text-foreground">{selected.user?.email}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" disabled={busy} onClick={saveEdit}>
                    {busy ? "Saving…" : "Save details"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-nowrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    onClick={() => {
                      setEditForm(buildEditForm(selected));
                      setEditing(true);
                    }}
                  >
                    <Icon icon={Pencil} size="sm" />
                    Edit user
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-error hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
                    onClick={() => {
                      setDeleteTarget(selected);
                      setDeleteConfirm("");
                    }}
                  >
                    <Icon icon={Trash2} size="sm" />
                    Delete registration
                  </button>
                </div>
                <RegistrationDetailFields row={selected} />
              </>
            )}

            {!editing && selected.status !== "CONFIRMED" ? (
              <div className="space-y-4 border-t border-border pt-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground/80">
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
                    <label className="mb-1.5 block text-xs font-medium text-foreground/80">
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
                </div>
              </div>
            ) : null}

            {!editing && selected.status === "CONFIRMED" ? (
              <div className="border-t border-border pt-4">
                {selected.adminNotes ? (
                  <p className="text-sm text-foreground/80">
                    <span className="font-medium text-foreground">Admin note:</span>{" "}
                    {selected.adminNotes}
                  </p>
                ) : (
                  <p className="text-sm text-foreground/80">This registration is approved.</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    resendAccessCode();
                  }}
                >
                  Resend access code
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !busy && setDeleteTarget(null)}
        title="Delete registration"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            This removes <strong>{deleteTarget?.displayName || deleteTarget?.user?.email}</strong>{" "}
            from this conference (registration, attendance, feedback, and access code). Type{" "}
            <strong>DELETE</strong> to confirm.
          </p>
          <Input
            label="Confirmation"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteRegistration}
              disabled={busy || deleteConfirm !== "DELETE"}
            >
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
