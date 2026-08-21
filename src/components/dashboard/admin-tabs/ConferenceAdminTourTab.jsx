"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TablePagination } from "@/components/ui/TablePagination";
import { cn } from "@/lib/cn";
import { paginateRows } from "@/lib/table/paginate";
import { downloadCsv } from "@/lib/csv/download";
import { formatAmountPaidInput } from "@/lib/tour/money";
import { formatAdminDate } from "./AdminTabShell";
import { AdminListFilters } from "./AdminListFilters";

const EMPTY_NEW = {
  firstName: "",
  lastName: "",
  organisation: "",
  email: "",
  amountPaid: "",
  notes: "",
};

/**
 * @param {{ conferenceId: string }} props
 */
export function ConferenceAdminTourTab({ conferenceId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState("existing"); // existing | new
  const [pickerQuery, setPickerQuery] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [existingForm, setExistingForm] = useState({
    organisation: "",
    amountPaid: "",
    notes: "",
  });
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [addForce, setAddForce] = useState(false);
  const [addWarning, setAddWarning] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/tour`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load tour registrations.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tour registrations.");
      if (!silent) setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!addOpen || addMode !== "existing") return;
    const q = pickerQuery.trim();
    if (q.length < 2) {
      setCandidates([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setCandidatesLoading(true);
      try {
        const res = await fetch(
          `/api/admin/conferences/${conferenceId}/tour?q=${encodeURIComponent(q)}`,
        );
        const json = await res.json();
        if (!cancelled && res.ok) setCandidates(json.candidates || []);
      } catch {
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setCandidatesLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [addOpen, addMode, pickerQuery, conferenceId]);

  const filtered = useMemo(() => {
    const rows = data?.rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [row.name, row.email, row.organisation, row.notes, row.amountPaidFormatted]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paged = useMemo(() => paginateRows(filtered, page, 25), [filtered, page]);

  function openAdd() {
    setAddMode("existing");
    setPickerQuery("");
    setCandidates([]);
    setSelectedUser(null);
    setExistingForm({ organisation: "", amountPaid: "", notes: "" });
    setNewForm(EMPTY_NEW);
    setAddForce(false);
    setAddWarning("");
    setAddOpen(true);
  }

  function exportCsv() {
    // Prefer full list from the server (Excel-compatible CSV), same pattern as gifts.
    window.open(
      `/api/admin/conferences/${conferenceId}/tour?format=excel`,
      "_blank",
    );
  }

  /** Optional: export only the currently filtered rows in the table. */
  function exportFilteredCsv() {
    const slug = data?.conference?.slug || "conference";
    downloadCsv(
      `${slug}-tour-registrations-filtered.csv`,
      [
        "Name",
        "Email",
        "Organisation",
        "Amount paid",
        "Notes",
        "Registered",
        "Registered by",
        "Conference attendee",
      ],
      filtered.map((row) => [
        row.name || "",
        row.email || "",
        row.organisation || "",
        row.amountPaidFormatted || "",
        row.notes || "",
        row.registeredAt ? new Date(row.registeredAt).toISOString() : "",
        row.registeredByLabel || "",
        row.isConferenceRegistered ? "Yes" : "No",
      ]),
    );
  }

  async function submitExisting() {
    if (!selectedUser) {
      toast.error("Select an existing person first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/tour`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addExisting",
          userId: selectedUser.userId,
          amountPaid: existingForm.amountPaid,
          organisation: existingForm.organisation || selectedUser.organisation || null,
          notes: existingForm.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not add tour registration.");
      toast.success(json.message || "Added to tour.");
      setAddOpen(false);
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add.");
    } finally {
      setBusy(false);
    }
  }

  async function submitNew() {
    setBusy(true);
    setAddWarning("");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/tour`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addNew",
          firstName: newForm.firstName,
          lastName: newForm.lastName,
          organisation: newForm.organisation,
          email: newForm.email,
          amountPaid: newForm.amountPaid,
          notes: newForm.notes,
          acknowledged: addForce,
        }),
      });
      const json = await res.json();
      if (res.status === 409 && json.needsConfirmation) {
        setAddForce(true);
        setAddWarning(json.message || "Confirm to continue.");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Could not add tour registration.");
      toast.success(json.message || "Added to tour.");
      setAddOpen(false);
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/tour`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", registrationId: removeTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not remove.");
      toast.success("Removed from tour registration.");
      setRemoveTarget(null);
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Loading tour registrations…</p>;
  }

  if (error && !data) {
    return <p className="text-sm text-error">{error}</p>;
  }

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Conference tour</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            People registered for the tour only appear here unless they are also added as
            conference attendees or gift recipients.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={FileSpreadsheet}
            disabled={!summary?.total}
            onClick={exportCsv}
          >
            Export CSV
          </Button>
          {search.trim() && filtered.length > 0 && filtered.length !== (summary?.total ?? 0) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!filtered.length}
              onClick={exportFilteredCsv}
            >
              Export filtered
            </Button>
          ) : null}
          <Button type="button" variant="primary" size="sm" icon={Plus} onClick={openAdd}>
            Add registration
          </Button>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">Registered</p>
            <p className="text-lg font-semibold text-foreground">{summary.total}</p>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">Total amount paid</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {summary.amountTotalFormatted}
            </p>
          </div>
        </div>
      ) : null}

      <AdminListFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, organisation…"
      />

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-neutral-50/80 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Organisation</th>
              <th className="px-3 py-2">Amount paid</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">Added</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {paged.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No tour registrations yet.
                </td>
              </tr>
            ) : (
              paged.rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.email || "No email"}</p>
                    {row.isConferenceRegistered ? (
                      <span className="mt-1 inline-block rounded-md bg-primary-light px-2 py-0.5 text-xs text-primary">
                        Also conference attendee
                      </span>
                    ) : (
                      <span className="mt-1 inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-muted-foreground">
                        Tour only
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {row.organisation || "—"}
                  </td>
                  <td className="px-3 py-2.5 font-medium tabular-nums text-foreground">
                    {row.amountPaidFormatted}
                  </td>
                  <td className="max-w-[220px] px-3 py-2.5 text-xs text-muted-foreground">
                    {row.notes || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    <p>{formatAdminDate(row.registeredAt)}</p>
                    <p>{row.registeredByLabel}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      disabled={busy}
                      aria-label={`Remove ${row.name}`}
                      onClick={() => setRemoveTarget(row)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
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

      <Modal
        open={addOpen}
        onClose={() => !busy && setAddOpen(false)}
        title="Add tour registration"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              { value: "existing", label: "Existing user" },
              { value: "new", label: "Add new" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setAddMode(opt.value);
                  setAddForce(false);
                  setAddWarning("");
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  addMode === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-neutral-100 text-muted-foreground hover:bg-neutral-200",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {addMode === "existing" ? (
            <div className="space-y-3">
              <Input
                label="Search attendees, gifts recipients, or users"
                value={pickerQuery}
                onChange={(e) => {
                  setPickerQuery(e.target.value);
                  setSelectedUser(null);
                }}
                placeholder="Type at least 2 characters…"
                hint="Same person is reused — never duplicated across groups."
              />
              {candidatesLoading ? (
                <p className="text-xs text-muted-foreground">Searching…</p>
              ) : null}
              {candidates.length > 0 ? (
                <ul className="max-h-48 overflow-y-auto rounded-md border border-border">
                  {candidates.map((c) => (
                    <li key={c.userId}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-primary-light/50",
                          selectedUser?.userId === c.userId && "bg-primary-light",
                        )}
                        onClick={() => {
                          setSelectedUser(c);
                          setExistingForm((p) => ({
                            ...p,
                            organisation: c.organisation || p.organisation,
                          }));
                        }}
                      >
                        <span className="font-medium text-foreground">{c.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.email || "No email"}
                          {c.organisation ? ` · ${c.organisation}` : ""}
                          {" · "}
                          {(c.sources || []).join(", ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : pickerQuery.trim().length >= 2 && !candidatesLoading ? (
                <p className="text-xs text-muted-foreground">
                  No matches. Switch to “Add new” if this person is not in the system.
                </p>
              ) : null}

              {selectedUser ? (
                <p className="rounded-md border border-primary/20 bg-primary-light/40 px-3 py-2 text-sm text-foreground">
                  Selected: <strong>{selectedUser.name}</strong>
                  {selectedUser.email ? ` (${selectedUser.email})` : ""}
                </p>
              ) : null}

              <Input
                label="Organisation"
                value={existingForm.organisation}
                onChange={(e) =>
                  setExistingForm((p) => ({ ...p, organisation: e.target.value }))
                }
                hint="Optional"
              />
              <Input
                label="Amount paid"
                value={existingForm.amountPaid}
                onChange={(e) =>
                  setExistingForm((p) => ({
                    ...p,
                    amountPaid: formatAmountPaidInput(e.target.value),
                  }))
                }
                required
                hint="Required — commas are formatted automatically"
              />
              <Input
                label="Notes"
                value={existingForm.notes}
                onChange={(e) => setExistingForm((p) => ({ ...p, notes: e.target.value }))}
                hint="Optional"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" disabled={busy} onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  icon={Search}
                  disabled={busy || !selectedUser || !existingForm.amountPaid.trim()}
                  onClick={submitExisting}
                >
                  {busy ? "Saving…" : "Add to tour"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="First name"
                  value={newForm.firstName}
                  onChange={(e) => setNewForm((p) => ({ ...p, firstName: e.target.value }))}
                  required
                />
                <Input
                  label="Last name"
                  value={newForm.lastName}
                  onChange={(e) => setNewForm((p) => ({ ...p, lastName: e.target.value }))}
                  required
                />
              </div>
              <Input
                label="Organisation"
                value={newForm.organisation}
                onChange={(e) => setNewForm((p) => ({ ...p, organisation: e.target.value }))}
                hint="Optional"
              />
              <Input
                label="Email"
                type="email"
                value={newForm.email}
                onChange={(e) => setNewForm((p) => ({ ...p, email: e.target.value }))}
                hint="Optional — helps match an existing account"
              />
              <Input
                label="Amount paid"
                value={newForm.amountPaid}
                onChange={(e) =>
                  setNewForm((p) => ({
                    ...p,
                    amountPaid: formatAmountPaidInput(e.target.value),
                  }))
                }
                required
                hint="Required — commas are formatted automatically"
              />
              <Input
                label="Notes"
                value={newForm.notes}
                onChange={(e) => setNewForm((p) => ({ ...p, notes: e.target.value }))}
                hint="Optional"
              />
              {addWarning ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {addWarning}
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" disabled={busy} onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  icon={Plus}
                  disabled={
                    busy ||
                    !newForm.firstName.trim() ||
                    !newForm.lastName.trim() ||
                    !newForm.amountPaid.trim()
                  }
                  onClick={submitNew}
                >
                  {busy
                    ? "Saving…"
                    : addForce
                      ? "Confirm & add"
                      : "Add to tour"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(removeTarget)}
        onClose={() => !busy && setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title="Remove tour registration"
        message={
          removeTarget
            ? `Remove ${removeTarget.name} from the conference tour list?\n\nThey will not be deleted from the system. If they are also a conference attendee or gift recipient, those records stay unchanged.`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        loading={busy && Boolean(removeTarget)}
      />
    </div>
  );
}
