"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Plus, UserCog } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { TablePagination } from "@/components/ui/TablePagination";
import { cn } from "@/lib/cn";
import { paginateRows } from "@/lib/table/paginate";
import { downloadCsv } from "@/lib/csv/download";
import { GIFT_CATEGORY_PARTICIPANTS } from "@/lib/gifts/settings";

const EMPTY_ADD_FORM = { firstName: "", lastName: "", email: "", comment: "" };

/**
 * @param {{ id: string; name: string; count: number; stock?: number; remaining?: number }[] | undefined} itemCounts
 */
function ItemCountsLine({ itemCounts }) {
  const rows = (itemCounts || []).filter((item) => item.count > 0);
  if (rows.length === 0) {
    return <span className="text-foreground/70">None yet</span>;
  }
  return (
    <span className="text-foreground">
      {rows.map((item, i) => (
        <span key={item.id}>
          {i > 0 ? " · " : null}
          <strong className="tabular-nums text-primary">{item.count}</strong> {item.name}
        </span>
      ))}
    </span>
  );
}

/**
 * @param {{ conferenceId: string }} props
 */
export function ConferenceAdminGiftsTab({ conferenceId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [attendanceAction, setAttendanceAction] = useState("gift_only");
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addItems, setAddItems] = useState({});
  const [addForce, setAddForce] = useState(false);
  const [addWarning, setAddWarning] = useState("");
  const [issuersOpen, setIssuersOpen] = useState(false);
  const [issuers, setIssuers] = useState(null);
  const [issuersLoading, setIssuersLoading] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/conference-gifts/${conferenceId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load gifts.");
      setData(json);
      setCategory((prev) => {
        if (prev === "all") return "all";
        const enabled = json.enabledCategories ?? [];
        if (prev && enabled.some((c) => c.value === prev)) return prev;
        return "all";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load gifts.");
      if (!silent) setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  const combinedRoster = useMemo(() => {
    if (!data) return [];
    if (category === "all") {
      return data.roster ?? Object.values(data.rostersByCategory || {}).flat();
    }
    return data.rostersByCategory?.[category] ?? [];
  }, [data, category]);

  const roster = useMemo(() => {
    const q = search.trim().toLowerCase();
    return combinedRoster.filter((row) => {
      if (statusFilter === "issued" && !row.isFullyIssued) return false;
      if (statusFilter === "partial" && (!row.isIssued || row.isFullyIssued)) return false;
      if (statusFilter === "pending" && row.isIssued) return false;
      if (!q) return true;
      const hay = [
        row.name,
        row.email,
        row.telephone,
        row.title,
        row.accessCode,
        row.categoryLabel,
        row.issuedByName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [combinedRoster, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, category]);

  const paged = useMemo(() => paginateRows(roster, page, 25), [roster, page]);

  function exportGiftsList() {
    downloadCsv(
      "gifts.csv",
      ["Name", "Role", "Email", "Status", "Items issued", "Issued by", "Registered by"],
      roster.map((row) => [
        row.name || "",
        row.categoryLabel || row.speakerType || "",
        row.email || "",
        row.isFullyIssued ? "Issued" : row.isIssued ? "Partial" : "Not issued",
        (row.issuedItemDetails || []).map((d) => `${d.name}×${d.quantity}`).join("; "),
        row.issuedByName || "",
        row.registeredByLabel || "",
      ]),
    );
  }

  function needsAttendanceChoice(row) {
    return Boolean(
      row?.isConferenceRegistered &&
        row?.registrationStatus === "CONFIRMED" &&
        row?.userId &&
        data?.todayDayIndex &&
        !row.attendedToday,
    );
  }

  function openIssue(row) {
    setSelected(row);
    const defaults = {};
    const hasAnyIssued = Boolean(row.isIssued);
    for (const item of data?.catalog ?? []) {
      const already = Number(row.issuedItems?.[item.id] ?? 0);
      defaults[item.id] = hasAnyIssued ? (already > 0 ? already : 0) : item.quantity;
    }
    setSelectedItems(defaults);
    setAttendanceAction(needsAttendanceChoice(row) ? "issue_and_mark" : "gift_only");
  }

  function openAddParticipant() {
    const defaults = {};
    for (const item of data?.catalog ?? []) {
      defaults[item.id] = item.quantity;
    }
    setAddForm(EMPTY_ADD_FORM);
    setAddItems(defaults);
    setAddForce(false);
    setAddWarning("");
    setAddOpen(true);
  }

  async function issueGifts() {
    if (!selected) return;
    setBusy(true);
    try {
      const items = {};
      for (const [id, qty] of Object.entries(selectedItems)) {
        if (qty) items[id] = Number(qty);
      }
      const res = await fetch(`/api/admin/conference-gifts/${conferenceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientKey: selected.recipientKey,
          category: selected.category,
          items,
          userId: selected.userId || undefined,
          isConferenceRegistered: Boolean(selected.isConferenceRegistered),
          attendanceAction: needsAttendanceChoice(selected)
            ? attendanceAction
            : "gift_only",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not issue gifts.");
      const marked =
        needsAttendanceChoice(selected) && attendanceAction === "issue_and_mark";
      toast.success(
        marked
          ? selected.isIssued
            ? "Gifts updated and attendance marked for today."
            : "Gifts issued and attendance marked for today."
          : selected.isIssued
            ? "Gifts updated."
            : "Gifts issued.",
      );
      setSelected(null);
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not issue gifts.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAddAndIssue(acknowledged = addForce) {
    setBusy(true);
    setAddWarning("");
    try {
      const items = {};
      for (const [id, qty] of Object.entries(addItems)) {
        if (qty) items[id] = Number(qty);
      }
      if (Object.keys(items).length === 0) {
        throw new Error("Select at least one gift item to issue.");
      }
      const res = await fetch(`/api/admin/conference-gifts/${conferenceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addAndIssue",
          firstName: addForm.firstName.trim(),
          lastName: addForm.lastName.trim(),
          email: addForm.email.trim() || undefined,
          comment: addForm.comment.trim() || undefined,
          acknowledged,
          items,
        }),
      });
      const json = await res.json();
      if (res.status === 409 && json.needsConfirmation) {
        setAddWarning(json.message || "Please confirm before continuing.");
        setAddForce(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Could not save and issue gifts.");
      toast.success(json.message || "Gifts issued.");
      setAddOpen(false);
      setAddForm(EMPTY_ADD_FORM);
      setAddForce(false);
      setAddWarning("");
      setCategory("all");
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save and issue gifts.");
    } finally {
      setBusy(false);
    }
  }

  function downloadExcel() {
    window.open(`/api/admin/conference-gifts/${conferenceId}?format=excel`, "_blank");
  }

  async function openIssuersReport() {
    setIssuersOpen(true);
    setIssuersLoading(true);
    try {
      const res = await fetch(`/api/admin/conference-gifts/${conferenceId}?format=issuers`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load admin report.");
      setIssuers(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load admin report.");
      setIssuers(null);
    } finally {
      setIssuersLoading(false);
    }
  }

  function downloadIssuersExcel() {
    window.open(
      `/api/admin/conference-gifts/${conferenceId}?format=issuers-excel`,
      "_blank",
    );
  }

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Loading gifts…</p>;
  }
  if (error) return <p className="text-sm text-error">{error}</p>;

  if (!data?.settings?.applicable) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/80">
        Awards & gifts are not applicable for this conference. Enable them in the conference
        editor under Awards & gifts.
      </p>
    );
  }

  const enabled = data.enabledCategories ?? [];
  const participantsEnabled = enabled.some((c) => c.value === GIFT_CATEGORY_PARTICIPANTS);
  const report = data.report;
  const totalCount = combinedRoster.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Gifts & awards</h3>
          <p className="text-sm text-foreground/80">
            One list for participants, speakers, and MCs. Use Add for someone not already on a
            roster — they stay gifts-only until they are registered.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {participantsEnabled ? (
            <Button variant="primary" size="sm" icon={Plus} onClick={openAddParticipant}>
              Add
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={openIssuersReport}>
            <Icon icon={UserCog} size="sm" />
            Admin reports
          </Button>
          <Button variant="outline" size="sm" onClick={exportGiftsList} disabled={!roster.length}>
            <Icon icon={FileSpreadsheet} size="sm" />
            Export list
          </Button>
          <Button variant="outline" size="sm" onClick={downloadExcel}>
            <Icon icon={FileSpreadsheet} size="sm" />
            Download Excel
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-foreground/80">
            <tr>
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2 text-right">Issued</th>
              <th className="px-3 py-2 text-right">Pending</th>
              <th className="px-3 py-2 text-right">Eligible</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border font-medium">
              <td className="px-3 py-1.5">All</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-primary">
                {report?.overall?.issued ?? 0}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-amber-800">
                {report?.overall?.pending ?? 0}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {report?.overall?.recipients ?? 0}
              </td>
            </tr>
            {(report?.byCategory ?? []).map((row) => (
              <tr key={row.category} className="border-t border-border text-foreground/80">
                <td className="px-3 py-1.5">{row.label}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-primary">
                  {row.fullyIssued}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-amber-800">
                  {row.pending}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{row.recipients}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-border px-3 py-2 text-sm text-foreground">
          <span className="font-medium">Items issued: </span>
          <ItemCountsLine itemCounts={report?.overall?.itemCounts} />
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, role, issued by…"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All roles</option>
            {enabled.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label} ({data?.rostersByCategory?.[cat.value]?.length ?? 0})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="issued">Fully issued</option>
            <option value="partial">Partially issued</option>
            <option value="pending">Not issued</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-foreground/80">
        Showing <strong className="text-foreground">{roster.length}</strong>
        {search.trim() || statusFilter !== "all" || category !== "all" ? (
          <>
            {" "}
            of <strong className="text-foreground">{totalCount}</strong>
          </>
        ) : null}{" "}
        people.
      </p>

      {roster.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/80">
          {totalCount === 0
            ? "No gift recipients yet."
            : "No recipients match your search / filters."}
        </p>
      ) : (
        <>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-foreground/80">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Contact / title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Issued by</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((row) => {
                const details = row.issuedItemDetails || [];
                return (
                  <tr
                    key={`${row.category}:${row.recipientKey}`}
                    className={cn(
                      "border-t border-border",
                      row.isFullyIssued && "bg-primary-light/40",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{row.name}</span>
                        {row.isConferenceRegistered === false && row.userId ? (
                          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                            Gifts only
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {row.categoryLabel || row.speakerType || "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {row.email || row.title || "—"}
                      {row.telephone ? <p className="text-xs">{row.telephone}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium",
                          row.isFullyIssued
                            ? "bg-primary-light text-primary"
                            : row.isIssued
                              ? "bg-amber-50 text-amber-800"
                              : "bg-neutral-100 text-foreground/80",
                        )}
                      >
                        {row.isFullyIssued
                          ? "Issued"
                          : row.isIssued
                            ? "Partial"
                            : "Not issued"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {details.length > 0 ? (
                        <ul className="space-y-0.5">
                          {details.map((item) => (
                            <li key={item.id}>
                              {item.name}
                              <span className="tabular-nums text-foreground"> ×{item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{row.issuedByName || "—"}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => openIssue(row)}>
                        {row.isIssued ? "Update" : "Issue"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
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
        </>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => !busy && setSelected(null)}
        title={`${selected?.isIssued ? "Update" : "Issue"} gifts — ${selected?.name || ""}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            {selected?.isIssued
              ? "Previously issued items stay checked. Adjust the selection, then confirm to update."
              : "All catalog items are selected by default. Uncheck any that should not be issued now."}
          </p>
          {selected?.isConferenceRegistered === false ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Gifts list only — this person is not registered for the conference, so attendance
              cannot be marked here.
            </p>
          ) : null}
          {selected?.comment ? (
            <p className="text-sm text-foreground/80">
              <span className="font-medium text-foreground">Comment:</span> {selected.comment}
            </p>
          ) : null}
          <ul className="space-y-2">
            {(data?.catalog ?? []).map((item) => {
              const checked = Number(selectedItems[item.id] ?? 0) > 0;
              const previously = Number(selected?.issuedItems?.[item.id] ?? 0) > 0;
              return (
                <li key={item.id}>
                  <label className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedItems((prev) => ({
                          ...prev,
                          [item.id]: e.target.checked ? item.quantity : 0,
                        }))
                      }
                    />
                    <span className="flex-1 font-medium">
                      {item.name}
                      {previously ? (
                        <span className="ml-2 text-xs font-normal text-primary">Already issued</span>
                      ) : null}
                    </span>
                    <span className="text-foreground/80">×{item.quantity}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {needsAttendanceChoice(selected) ? (
            <fieldset className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
              <legend className="px-1 text-sm font-medium text-amber-950">
                This person has not marked attendance today
              </legend>
              <label className="flex items-start gap-2 text-sm text-amber-950">
                <input
                  type="radio"
                  className="mt-0.5"
                  name="gift-attendance-action"
                  checked={attendanceAction === "issue_and_mark"}
                  onChange={() => setAttendanceAction("issue_and_mark")}
                />
                <span>Issue gifts and mark attendance for today</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-amber-950">
                <input
                  type="radio"
                  className="mt-0.5"
                  name="gift-attendance-action"
                  checked={attendanceAction === "gift_only"}
                  onChange={() => setAttendanceAction("gift_only")}
                />
                <span>Issue gift only</span>
              </label>
            </fieldset>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelected(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={issueGifts} disabled={busy}>
              {busy ? "Saving…" : selected?.isIssued ? "Update gifts" : "Confirm issue"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={issuersOpen}
        onClose={() => !issuersLoading && setIssuersOpen(false)}
        title="Gifts issued by admin"
        size="xl"
      >
        <div className="space-y-4">
          {issuersLoading ? (
            <p className="text-sm text-muted-foreground">Loading admin summary…</p>
          ) : !issuers?.issuers?.length ? (
            <p className="text-sm text-foreground/80">No gifts have been issued yet.</p>
          ) : (
            <>
              <p className="text-sm text-foreground/80">
                {issuers.totals.admins} admin{issuers.totals.admins === 1 ? "" : "s"} ·{" "}
                {issuers.totals.recipientCount} recipient
                {issuers.totals.recipientCount === 1 ? "" : "s"} · {issuers.totals.totalItems}{" "}
                items in total.
              </p>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 text-left text-xs uppercase text-foreground/80">
                    <tr>
                      <th className="px-3 py-2">Admin</th>
                      {(issuers.catalog ?? []).map((item) => (
                        <th key={item.id} className="px-3 py-2 text-right">
                          {item.name}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuers.issuers.map((row) => (
                      <tr key={row.issuerId || row.name} className="border-t border-border">
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{row.name}</p>
                          {row.email ? (
                            <p className="text-xs text-foreground/70">{row.email}</p>
                          ) : null}
                        </td>
                        {(row.items ?? []).map((item) => (
                          <td key={item.id} className="px-3 py-2 text-right tabular-nums">
                            {item.count}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {row.totalItems}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-border bg-neutral-50 font-medium">
                      <td className="px-3 py-2">Total</td>
                      {(issuers.totals.items ?? []).map((item) => (
                        <td key={item.id} className="px-3 py-2 text-right tabular-nums">
                          {item.count}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right tabular-nums">
                        {issuers.totals.totalItems}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIssuersOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={downloadIssuersExcel} disabled={!issuers?.issuers?.length}>
              <Icon icon={FileSpreadsheet} size="sm" />
              Download Excel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => !busy && setAddOpen(false)}
        title="Add to gifts list"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            Issue gifts to a person. If they are already registered for this conference, gifts go to
            that registration. If not, they are added to the gifts list only — they are not
            registered for the conference.
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
                hint="Optional — helps match an existing account"
                value={addForm.email}
                onChange={(e) => {
                  setAddForce(false);
                  setAddWarning("");
                  setAddForm((p) => ({ ...p, email: e.target.value }));
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

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Gifts to issue</p>
            <ul className="space-y-2">
              {(data?.catalog ?? []).map((item) => {
                const checked = Number(addItems[item.id] ?? 0) > 0;
                return (
                  <li key={item.id}>
                    <label className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary"
                        checked={checked}
                        onChange={(e) =>
                          setAddItems((prev) => ({
                            ...prev,
                            [item.id]: e.target.checked ? item.quantity : 0,
                          }))
                        }
                      />
                      <span className="flex-1 font-medium">{item.name}</span>
                      <span className="text-foreground/80">×{item.quantity}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
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
            <Button
              variant="primary"
              disabled={busy || !addForm.firstName.trim() || !addForm.lastName.trim()}
              onClick={() => submitAddAndIssue(addForce)}
            >
              {busy
                ? "Saving…"
                : addForce
                  ? "Confirm and issue gifts"
                  : "Save and issue gifts"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
