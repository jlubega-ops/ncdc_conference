"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { GIFT_CATEGORY_PARTICIPANTS } from "@/lib/gifts/settings";

/**
 * @param {{ id: string; name: string; count: number }[] | undefined} itemCounts
 */
function ItemCountsLine({ itemCounts }) {
  const rows = (itemCounts || []).filter((item) => item.count > 0);
  if (rows.length === 0) {
    return <span className="text-foreground/70">No items issued yet</span>;
  }
  return (
    <span className="text-foreground">
      {rows.map((item, i) => (
        <span key={item.id}>
          {i > 0 ? ", " : null}
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
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/gifts`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load gifts.");
      setData(json);
      setCategory((prev) => {
        const enabled = json.enabledCategories ?? [];
        if (prev && enabled.some((c) => c.value === prev)) return prev;
        return enabled[0]?.value || GIFT_CATEGORY_PARTICIPANTS;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load gifts.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCategory =
    category || data?.enabledCategories?.[0]?.value || GIFT_CATEGORY_PARTICIPANTS;

  const roster = useMemo(() => {
    const rows = data?.rostersByCategory?.[activeCategory] ?? data?.roster ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "issued") {
        if (!row.isFullyIssued) return false;
      }
      if (statusFilter === "partial") {
        if (!row.isIssued || row.isFullyIssued) return false;
      }
      if (statusFilter === "pending") {
        if (row.isIssued) return false;
      }
      if (!q) return true;
      const hay = [row.name, row.email, row.telephone, row.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, activeCategory, search, statusFilter]);

  function openIssue(row) {
    setSelected(row);
    const defaults = {};
    const hasAnyIssued = Boolean(row.isIssued);
    for (const item of data?.catalog ?? []) {
      const already = Number(row.issuedItems?.[item.id] ?? 0);
      // Re-open: keep only previously issued items checked.
      // First issue: select the full catalog by default.
      defaults[item.id] = hasAnyIssued ? (already > 0 ? already : 0) : item.quantity;
    }
    setSelectedItems(defaults);
  }

  async function issueGifts() {
    if (!selected) return;
    setBusy(true);
    try {
      const items = {};
      for (const [id, qty] of Object.entries(selectedItems)) {
        if (qty) items[id] = Number(qty);
      }
      const res = await fetch(`/api/admin/conferences/${conferenceId}/gifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientKey: selected.recipientKey,
          category: selected.category || activeCategory,
          items,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not issue gifts.");
      toast.success(selected.isIssued ? "Gifts updated." : "Gifts issued.");
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not issue gifts.");
    } finally {
      setBusy(false);
    }
  }

  function downloadExcel() {
    window.open(`/api/admin/conferences/${conferenceId}/gifts?format=excel`, "_blank");
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
  const report = data.report;
  const categoryCount =
    data?.rostersByCategory?.[activeCategory]?.length ??
    data?.roster?.length ??
    0;
  const activeCategoryReport = (report?.byCategory ?? []).find(
    (row) => row.category === activeCategory,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Gifts & awards</h3>
          <p className="text-sm text-foreground/80">
            Registered members appear under Participants. Speakers use the details added on the
            Speakers tab (they do not need to register). Issue gifts per person; issued recipients
            stay marked in the list.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadExcel}>
          <Icon icon={FileSpreadsheet} size="sm" />
          Download Excel
        </Button>
      </div>

      <div className="space-y-3 rounded-md border border-border bg-surface px-4 py-3 text-sm">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-foreground">
          <span>
            Fully issued:{" "}
            <strong className="text-primary">{report?.overall?.issued ?? 0}</strong>
          </span>
          <span>
            Pending:{" "}
            <strong className="text-amber-800">{report?.overall?.pending ?? 0}</strong>
          </span>
          <span>
            Recipients: <strong>{report?.overall?.recipients ?? 0}</strong>
          </span>
        </div>
        <p className="text-foreground">
          <span className="font-medium">Items issued (all categories): </span>
          <ItemCountsLine itemCounts={report?.overall?.itemCounts} />
        </p>
      </div>

      {(report?.byCategory ?? []).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {report.byCategory.map((row) => (
            <button
              key={row.category}
              type="button"
              onClick={() => setCategory(row.category)}
              className={cn(
                "max-w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                activeCategory === row.category
                  ? "border-primary bg-primary-light text-foreground"
                  : "border-border text-foreground hover:border-primary/40",
              )}
            >
              <p>
                <span className="font-medium">{row.label}:</span>{" "}
                <span className="font-semibold text-primary">{row.fullyIssued}</span> issued ·{" "}
                <span className="font-semibold text-amber-800">{row.pending}</span> pending ·{" "}
                <span className="font-semibold">{row.recipients}</span> eligible
              </p>
              <p className="mt-1 text-xs text-foreground/80">
                <ItemCountsLine itemCounts={row.itemCounts} />
              </p>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {enabled.map((cat) => {
          const count = data?.rostersByCategory?.[cat.value]?.length ?? 0;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-medium",
                activeCategory === cat.value
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground/80 hover:text-foreground",
              )}
            >
              {cat.label}
              <span className="ml-1.5 text-xs tabular-nums opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {activeCategoryReport ? (
        <p className="text-sm text-foreground">
          <span className="font-medium">{activeCategoryReport.label} items issued: </span>
          <ItemCountsLine itemCounts={activeCategoryReport.itemCounts} />
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, email, access code…"
          />
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
        {search.trim() || statusFilter !== "all" ? (
          <>
            {" "}
            of <strong className="text-foreground">{categoryCount}</strong>
          </>
        ) : null}{" "}
        {activeCategory === GIFT_CATEGORY_PARTICIPANTS
          ? "registered members"
          : "recipients"}{" "}
        in this category.
      </p>

      {roster.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/80">
          {categoryCount === 0
            ? activeCategory === GIFT_CATEGORY_PARTICIPANTS
              ? "No registered members for this conference yet."
              : "No recipients in this category yet."
            : "No recipients match your search / status filter."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-foreground/80">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">
                  {activeCategory === GIFT_CATEGORY_PARTICIPANTS ? "Contact" : "Title"}
                </th>
                {activeCategory === GIFT_CATEGORY_PARTICIPANTS ? (
                  <th className="px-4 py-3">Attendance</th>
                ) : (
                  <th className="px-4 py-3">Type</th>
                )}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Items issued</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((row) => {
                const details = row.issuedItemDetails || [];
                return (
                  <tr
                    key={row.recipientKey}
                    className={cn(
                      "border-t border-border",
                      row.isFullyIssued && "bg-primary-light/40",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                    <td className="px-4 py-3 text-foreground/80">
                      {activeCategory === GIFT_CATEGORY_PARTICIPANTS ? (
                        <>
                          {row.email || "—"}
                          {row.telephone ? (
                            <p className="text-xs">{row.telephone}</p>
                          ) : null}
                        </>
                      ) : (
                        row.title || "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {activeCategory === GIFT_CATEGORY_PARTICIPANTS
                        ? `${row.daysAttended ?? 0}/${row.totalDays ?? 0} days`
                        : row.speakerType || "—"}
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
    </div>
  );
}
