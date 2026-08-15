"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Trash2, Upload, Users } from "lucide-react";
import { AdminListFilters } from "./AdminListFilters";
import { AttendeeUploadDialog } from "./AttendeeUploadDialog";
import { AccessCodeDisplay } from "./AccessCodeDisplay";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { formatAdminDate } from "./AdminTabShell";
import { RegistrationDetailFields } from "./RegistrationDetailFields";
import { OrganisationSuggestInput } from "@/components/forms/OrganisationSuggestInput";

const EMPTY_PERSON = {
  firstName: "",
  lastName: "",
  email: "",
  organisation: "",
  comment: "",
  notes: "",
};

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
    email: row?.user?.email || form.email || "",
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
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_PERSON);
  const [addForce, setAddForce] = useState(false);
  const [addWarning, setAddWarning] = useState("");
  const [createdAccessKey, setCreatedAccessKey] = useState(null);
  const [repTarget, setRepTarget] = useState(null);
  const [repForm, setRepForm] = useState(EMPTY_PERSON);
  const [repForce, setRepForce] = useState(false);
  const [repWarning, setRepWarning] = useState("");
  const [repsView, setRepsView] = useState(null);
  const [organisations, setOrganisations] = useState([]);

  const organisationOptions = useMemo(() => {
    const set = new Set(organisations);
    for (const row of registrations) {
      if (row.institution) set.add(row.institution);
    }
    return [...set];
  }, [organisations, registrations]);
  const isAdminUpload = registrationMode === "ADMIN_UPLOAD";
  const isOpenNoReg = registrationMode === "OPEN_NO_REGISTRATION";
  const canManageRoster = !isOpenNoReg;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (accountFilter === "active" && !row.accessCodeSent) return false;
      if (accountFilter === "pending" && row.accessCodeSent) return false;
      if (!q) return true;
      const text = [
        row.displayName,
        row.user?.email,
        row.institution,
        row.organisation,
        row.status,
        row.accessCode,
      ]
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

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/registrations`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load registrations.");
      setRegistrations(data.registrations ?? []);
      if (!silent) setCheckedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load registrations.");
      if (!silent) setRegistrations([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    let cancelled = false;
    async function loadOrganisations() {
      try {
        const res = await fetch("/api/admin/organisations");
        const data = await res.json();
        if (!res.ok || cancelled) return;
        setOrganisations(Array.isArray(data.organisations) ? data.organisations : []);
      } catch {
        /* suggestions stay empty — typing still works */
      }
    }
    loadOrganisations();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Initial / conference-scoped fetch for the registrations roster.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data load on mount/dependency change
    void load();
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
      await load({ silent: true });
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
      await load({ silent: true });
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
      if (data.accessKey) {
        setSelected((prev) =>
          prev ? { ...prev, accessCode: data.accessKey, accessKeyIssued: true } : prev,
        );
      }
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
    const email = String(editForm.email || "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    const emailChanged =
      email.toLowerCase() !== String(selected.user?.email || "").toLowerCase();
    if (
      emailChanged &&
      selected.status === "CONFIRMED" &&
      !window.confirm(
        "Changing the email will revoke their current access code and email a new one to the new address. Continue?",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/registrations/${selected.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formData: { ...editForm, email } }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update details.");
      toast.success(data.message || "Details updated.");
      setEditing(false);
      await load({ silent: true });
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
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete registration.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAddAttendee(force = addForce) {
    setBusy(true);
    setAddWarning("");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: addForm.firstName.trim(),
          lastName: addForm.lastName.trim(),
          email: addForm.email.trim() || undefined,
          comment: addForm.comment.trim() || undefined,
          organisation: addForm.organisation.trim() || undefined,
          forceDuplicate: force,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.needsConfirmation) {
        setAddWarning(data.message || "This person is already registered for this conference.");
        setAddForce(Boolean(data.allowForce));
        return;
      }
      if (!res.ok) throw new Error(data.error || "Could not add attendee.");
      toast.success(data.message || "Attendee added.");
      const org = addForm.organisation.trim();
      if (org) {
        setOrganisations((prev) =>
          prev.some((item) => item.toLowerCase() === org.toLowerCase())
            ? prev
            : [...prev, org].sort((a, b) => a.localeCompare(b)),
        );
      }
      setCreatedAccessKey(data.accessKey || null);
      setAddOpen(false);
      setAddForm(EMPTY_PERSON);
      setAddForce(false);
      setAddWarning("");
      if (data.registration) {
        setRegistrations((prev) => {
          const next = prev.filter((row) => row.id !== data.registration.id);
          return [data.registration, ...next];
        });
        setSelected(data.registration);
      }
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add attendee.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAssignRepresentative(force = repForce) {
    if (!repTarget) return;
    setBusy(true);
    setRepWarning("");
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/registrations/${repTarget.id}/representatives`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: repForm.firstName.trim(),
            lastName: repForm.lastName.trim(),
            email: repForm.email.trim() || undefined,
            notes: repForm.notes.trim() || undefined,
            forceExisting: force,
          }),
        },
      );
      const data = await res.json();
      if (res.status === 409 && data.needsConfirmation) {
        setRepWarning(data.message || "Person already registered.");
        setRepForce(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Could not assign representative.");
      toast.success(data.message || "Representative assigned.");
      setRepTarget(null);
      setRepForm(EMPTY_PERSON);
      setRepForce(false);
      setRepWarning("");
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign representative.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && registrations.length === 0) {
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
        searchPlaceholder="Search name, email, organisation, or access code…"
        trailing={
          canManageRoster ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setAddForm(EMPTY_PERSON);
                  setAddForce(false);
                  setAddWarning("");
                  setAddOpen(true);
                }}
              >
                Add attendee
              </Button>
              {isAdminUpload ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Upload}
                  onClick={() => setUploadOpen(true)}
                >
                  Upload attendees
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[
          { value: "all", label: "All access codes" },
          { value: "active", label: "Code sent" },
          { value: "pending", label: "Not sent" },
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
            ? "No attendees yet. Upload a CSV list to add people. Access codes are not emailed until you send them."
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
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Access code</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3">Last access</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-foreground/80">
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                            STATUS_CLASS[row.status] ?? STATUS_CLASS.PENDING,
                          )}
                        >
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                        {row.isRepresented ? (
                          <button
                            type="button"
                            className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRepsView(row);
                            }}
                          >
                            Represented ({row.representatives?.length || 0})
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <AccessCodeDisplay
                        code={row.accessCode}
                        issued={row.accessKeyIssued}
                        sent={row.accessCodeSent}
                        compact
                      />
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3 text-foreground/80"
                      onClick={() => openRow(row)}
                    >
                      {formatAdminDate(row.registeredAt)}
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3 text-foreground/80"
                      onClick={() => openRow(row)}
                    >
                      {row.lastAccessAt ? formatAdminDate(row.lastAccessAt) : "Never"}
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
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          aria-label={`Assign representative for ${row.displayName || row.user?.email || "attendee"}`}
                          title="Assign representative"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRepTarget(row);
                            setRepForm(EMPTY_PERSON);
                            setRepForce(false);
                            setRepWarning("");
                          }}
                        >
                          <Icon icon={Users} size="sm" />
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
        onUploaded={() => load({ silent: true })}
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
                  <div className="sm:col-span-2">
                    <Input
                      label="Email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  {String(editForm.email || "").trim().toLowerCase() !==
                  String(selected.user?.email || "").toLowerCase() ? (
                    <p className="sm:col-span-2 text-sm text-amber-800">
                      Changing email revokes their current access code
                      {selected.status === "CONFIRMED"
                        ? " and emails a new one to this address."
                        : ". A new code will be issued when they are approved."}
                    </p>
                  ) : null}
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
                    label="Organisation"
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
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    onClick={() => {
                      setRepTarget(selected);
                      setRepForm(EMPTY_PERSON);
                      setRepForce(false);
                      setRepWarning("");
                    }}
                  >
                    <Icon icon={Users} size="sm" />
                    Assign representative
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
                <div className="rounded-md border border-border bg-neutral-50/60 px-3 py-3">
                  <p className="text-xs font-medium text-muted-foreground">Access code</p>
                  <div className="mt-1.5">
                    <AccessCodeDisplay
                      code={selected.accessCode}
                      issued={selected.accessKeyIssued}
                      sent={selected.accessCodeSent}
                    />
                  </div>
                </div>
                {selected.isRepresented ? (
                  <div className="rounded-md border border-primary/20 bg-primary-light/40 px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        Represented by {selected.representatives?.length || 0} person
                        {(selected.representatives?.length || 0) === 1 ? "" : "s"}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRepsView(selected)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ) : null}
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
          <div className="rounded-md border border-error/30 bg-error/10 px-3 py-3 text-sm text-foreground">
            <p className="font-semibold text-error">This cannot be undone.</p>
            <p className="mt-2 text-foreground/90">
              Removing{" "}
              <span className="font-semibold">
                {deleteTarget?.displayName || deleteTarget?.user?.email}
              </span>{" "}
              deletes their registration for this conference plus attendance, feedback,
              certificates, papers, gifts, and access codes for this conference only.
            </p>
            <p className="mt-2 text-foreground/90">
              If they belong <span className="font-semibold">only</span> to this conference and
              are not staff, their entire user account will also be deleted.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Type <strong className="text-foreground">DELETE</strong> to confirm.
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

      <Modal
        open={addOpen}
        onClose={() => !busy && setAddOpen(false)}
        title="Add attendee"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            Add someone to this conference roster. Existing platform users who are not yet registered
            here can be added. Duplicate means they are already registered for this conference.
            Access codes are created but not emailed until you use Send access codes.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              requiredMark
              value={addForm.firstName}
              onChange={(e) => {
                setAddForce(false);
                setAddWarning("");
                setAddForm((p) => ({ ...p, firstName: e.target.value }));
              }}
            />
            <Input
              label="Last name"
              requiredMark
              value={addForm.lastName}
              onChange={(e) => {
                setAddForce(false);
                setAddWarning("");
                setAddForm((p) => ({ ...p, lastName: e.target.value }));
              }}
            />
            <div className="sm:col-span-2">
              <Input
                label="Email"
                type="email"
                hint="Recommended — needed later to email the access code"
                value={addForm.email}
                onChange={(e) => {
                  setAddForce(false);
                  setAddWarning("");
                  setAddForm((p) => ({ ...p, email: e.target.value }));
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <OrganisationSuggestInput
                label="Organisation"
                hint="Optional — suggestions appear as you type from existing organisations"
                value={addForm.organisation}
                organisations={organisationOptions}
                onChange={(value) => {
                  setAddForce(false);
                  setAddWarning("");
                  setAddForm((p) => ({ ...p, organisation: value }));
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Comment"
                hint="Optional"
                value={addForm.comment}
                onChange={(e) => setAddForm((p) => ({ ...p, comment: e.target.value }))}
              />
            </div>
          </div>
          {addWarning ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {addWarning}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            {addForce ? (
              <Button
                variant="primary"
                disabled={busy || !addForm.firstName.trim() || !addForm.lastName.trim()}
                onClick={() => submitAddAttendee(true)}
              >
                {busy ? "Saving…" : "Add anyway"}
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={
                  busy ||
                  !addForm.firstName.trim() ||
                  !addForm.lastName.trim() ||
                  Boolean(addWarning)
                }
                onClick={() => submitAddAttendee(false)}
              >
                {busy ? "Saving…" : "Add attendee"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(repTarget)}
        onClose={() => !busy && setRepTarget(null)}
        title="Assign representative"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            Assign someone to attend on behalf of{" "}
            <strong>{repTarget?.displayName || repTarget?.user?.email}</strong>. A person can have
            one or more representatives.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              requiredMark
              value={repForm.firstName}
              onChange={(e) => setRepForm((p) => ({ ...p, firstName: e.target.value }))}
            />
            <Input
              label="Last name"
              requiredMark
              value={repForm.lastName}
              onChange={(e) => setRepForm((p) => ({ ...p, lastName: e.target.value }))}
            />
            <div className="sm:col-span-2">
              <Input
                label="Email"
                type="email"
                hint="Optional but recommended"
                value={repForm.email}
                onChange={(e) => setRepForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Notes"
                value={repForm.notes}
                onChange={(e) => setRepForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          {repWarning ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {repWarning}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setRepTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={busy || !repForm.firstName.trim() || !repForm.lastName.trim()}
              onClick={() => submitAssignRepresentative(repForce)}
            >
              {busy ? "Saving…" : repForce ? "Assign anyway" : "Assign representative"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(repsView)}
        onClose={() => setRepsView(null)}
        title={`Representatives — ${repsView?.displayName || repsView?.user?.email || ""}`}
      >
        <div className="space-y-3">
          {(repsView?.representatives || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No representatives assigned.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {(repsView?.representatives || []).map((rep) => (
                <li key={rep.id} className="px-3 py-2.5">
                  <p className="text-sm font-medium text-foreground">{rep.name}</p>
                  <p className="text-xs text-muted-foreground">{rep.email}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setRepsView(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(createdAccessKey)}
        onClose={() => setCreatedAccessKey(null)}
        title="Access code ready"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            Access code created but not emailed. Copy it to share manually, or use Send access codes
            later.
          </p>
          <AccessCodeDisplay code={createdAccessKey} sent={false} />
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setCreatedAccessKey(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
