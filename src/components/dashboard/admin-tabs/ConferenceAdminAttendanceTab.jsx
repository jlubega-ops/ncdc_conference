"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserCheck, UserX } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { formatAdminDate } from "./AdminTabShell";

/**
 * Admin attendance: day summaries, registered vs attended, override marks.
 * User edit/delete lives on the Registrations tab.
 * @param {{ conferenceId: string }} props
 */
export function ConferenceAdminAttendanceTab({ conferenceId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyKey, setBusyKey] = useState("");
  const [busy, setBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/attendance`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load attendance.");
      setData(json);
      setDayFilter((prev) => {
        if (prev !== "all" && json.days?.some((d) => d.date === prev)) return prev;
        return json.todayKey && json.days?.some((d) => d.date === json.todayKey)
          ? json.todayKey
          : json.days?.[0]?.date || "all";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load attendance.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedDay = useMemo(() => {
    if (!data?.days?.length) return null;
    if (dayFilter === "all") return null;
    return data.days.find((d) => d.date === dayFilter) ?? null;
  }, [data, dayFilter]);

  const filteredRoster = useMemo(() => {
    const roster = data?.roster ?? [];
    const q = search.trim().toLowerCase();
    return roster.filter((row) => {
      if (q) {
        const hay = [row.name, row.email, row.telephone, row.institution]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (dayFilter !== "all" && statusFilter !== "all") {
        const attended = Boolean(row.byDay?.[dayFilter]?.attended);
        if (statusFilter === "attended" && !attended) return false;
        if (statusFilter === "absent" && attended) return false;
      }

      return true;
    });
  }, [data, search, dayFilter, statusFilter]);

  async function overrideAttendance(row, dayDate, attended) {
    const key = `${row.userId}:${dayDate}:${attended ? "on" : "off"}`;
    setBusyKey(key);
    try {
      if (!attended) {
        setDeleteTarget({
          userId: row.userId,
          dayDate,
          name: row.name,
          attendanceId: row.byDay?.[dayDate]?.attendanceId ?? null,
        });
        setDeleteConfirm("");
        return;
      }

      const res = await fetch(`/api/admin/conferences/${conferenceId}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: row.userId, dayDate, attended: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not update attendance.");
      toast.success(`Marked present for ${row.name}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update attendance.");
    } finally {
      setBusyKey("");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/attendance`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceId: deleteTarget.attendanceId || undefined,
          userId: deleteTarget.userId,
          dayDate: deleteTarget.dayDate,
          confirm: deleteConfirm,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not remove attendance.");
      toast.success("Attendance removed.");
      setDeleteTarget(null);
      setDeleteConfirm("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove attendance.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading attendance…</p>;
  }
  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  const summary = data?.summary;
  const days = data?.days ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Attendance overview</h3>
        <p className="text-sm text-foreground/80">
          Compare registered participants with who attended each day. Override presence here. Edit
          or delete users from the Registrations tab.
        </p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-foreground">
        <StatInline label="Registered" value={summary?.registered ?? 0} />
        <StatInline
          label={summary?.today ? `Present (Day ${summary.today.dayIndex})` : "Present today"}
          value={summary?.today?.attended ?? 0}
          tone="primary"
        />
        <StatInline
          label={summary?.today ? `Absent (Day ${summary.today.dayIndex})` : "Absent today"}
          value={summary?.today?.absent ?? 0}
          tone="amber"
        />
        <StatInline
          label={summary?.today ? `Rate (Day ${summary.today.dayIndex})` : "Attendance rate"}
          value={`${summary?.today?.rate ?? 0}%`}
          tone="primary"
        />
      </div>

      {days.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">By conference day</p>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setDayFilter(day.date)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                  dayFilter === day.date
                    ? "border-primary bg-primary-light text-foreground"
                    : "border-border bg-surface text-foreground hover:border-primary/40",
                )}
              >
                <span className="font-semibold">Day {day.dayIndex}</span>
                <span className="text-foreground/80">{day.date}</span>
                {day.isToday ? (
                  <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                    Today
                  </span>
                ) : null}
                <span className="text-foreground/80">·</span>
                <span>
                  <span className="font-semibold text-primary">{day.attended}</span> attended
                </span>
                <span>
                  <span className="font-semibold text-amber-800">{day.absent}</span> absent
                </span>
                <span className="font-semibold text-foreground">{day.rate}%</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-foreground/80">
          No conference days configured yet.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="min-w-[180px] flex-1">
          <Input
            label="Search participants"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, phone…"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Day</label>
          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
          >
            <option value="all">All days (overview)</option>
            {days.map((d) => (
              <option key={d.date} value={d.date}>
                Day {d.dayIndex} — {d.date}
                {d.isToday ? " (today)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm disabled:opacity-50"
            value={statusFilter}
            disabled={dayFilter === "all"}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="attended">Attended</option>
            <option value="absent">Not attended</option>
          </select>
        </div>
      </div>

      {(data?.roster ?? []).length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/80">
          No confirmed registrations yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-foreground/80">
              <tr>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Registered</th>
                {dayFilter === "all" ? (
                  <th className="px-4 py-3">Days attended</th>
                ) : (
                  <th className="px-4 py-3">Day {selectedDay?.dayIndex ?? ""} status</th>
                )}
                <th className="px-4 py-3">Override</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.map((row) => {
                const dayMark = dayFilter !== "all" ? row.byDay?.[dayFilter] : null;
                const attended = Boolean(dayMark?.attended);
                const overrideKey = `${row.userId}:${dayFilter}:on`;

                return (
                  <tr key={row.userId} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="text-xs text-foreground/80">{row.email}</p>
                      {row.telephone ? (
                        <p className="text-xs text-foreground/80">{row.telephone}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                        Confirmed
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {dayFilter === "all" ? (
                        <div>
                          <p className="font-medium text-foreground">
                            {row.daysAttended}/{row.totalDays}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {days.map((d) => (
                              <span
                                key={d.date}
                                title={`Day ${d.dayIndex}`}
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold",
                                  row.byDay?.[d.date]?.attended
                                    ? "bg-primary-light text-primary"
                                    : "bg-neutral-100 text-foreground/80",
                                )}
                              >
                                {d.dayIndex}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs font-medium",
                              attended
                                ? "bg-primary-light text-primary"
                                : "bg-amber-50 text-amber-800",
                            )}
                          >
                            {attended ? "Attended" : "Not attended"}
                          </span>
                          {attended && dayMark?.markedAt ? (
                            <p className="mt-1 text-xs text-foreground/80">
                              {formatAdminDate(dayMark.markedAt)}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {dayFilter !== "all" ? (
                        attended ? (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={UserX}
                            onClick={() => overrideAttendance(row, dayFilter, false)}
                          >
                            Mark absent
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={UserCheck}
                            disabled={busyKey === overrideKey}
                            onClick={() => overrideAttendance(row, dayFilter, true)}
                          >
                            {busyKey === overrideKey ? "Saving…" : "Mark present"}
                          </Button>
                        )
                      ) : (
                        <span className="text-xs text-foreground/80">Select a day to override</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredRoster.length === 0 ? (
            <p className="border-t border-border px-4 py-6 text-center text-sm text-foreground/80">
              No participants match these filters.
            </p>
          ) : null}
        </div>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !busy && setDeleteTarget(null)}
        title="Mark absent"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            Remove attendance for <strong>{deleteTarget?.name}</strong> on{" "}
            {deleteTarget?.dayDate}. Type <strong>DELETE</strong> to confirm.
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
              onClick={confirmDelete}
              disabled={busy || deleteConfirm !== "DELETE"}
            >
              {busy ? "Removing…" : "Mark absent"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatInline({ label, value, tone = "neutral" }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-foreground">{label}:</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "amber" && "text-amber-800",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </span>
    </span>
  );
}
