"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { AttendanceStatsPanel } from "@/components/dashboard/AttendanceStatsPanel";
import { ConferenceCertificateTab } from "@/components/conference/ConferenceCertificateTab";
import { formatAdminDate } from "@/components/dashboard/admin-tabs/AdminTabShell";

const STATUS_LABELS = {
  attended: "Attended",
  missed: "Missed",
  upcoming: "Upcoming",
  today_open: "Today — check-in open",
  today_upcoming: "Today — not yet open",
};

const STATUS_CLASS = {
  attended: "bg-primary-light text-primary",
  missed: "bg-amber-50 text-amber-800",
  upcoming: "bg-neutral-100 text-muted-foreground",
  today_open: "bg-blue-50 text-blue-800",
  today_upcoming: "bg-neutral-100 text-muted-foreground",
};

/**
 * Attendance + certificate view for the combined conference tab.
 * @param {{ slug: string }} props
 */
export function ConferenceAttendanceTab({ slug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/me/attendance/${slug}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load attendance.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load attendance.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCheckIn() {
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/me/attendance/${slug}/check-in`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Check-in failed.");
      toast.success("Attendance registered for today.");
      setData(json);
      // Best-effort: email certificate PDF when newly eligible
      try {
        await fetch(`/api/me/certificates/${slug}/email`, { method: "POST" });
      } catch {
        /* ignore — eligibility may not be met yet */
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check-in failed.");
    } finally {
      setCheckingIn(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading attendance…</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-error">{error || "Attendance not available."}</p>;
  }

  const { today, stats, runningToday } = data;

  return (
    <div className="space-y-8">
      {runningToday && today ? (
        <div className="rounded-lg border border-primary/30 bg-primary-light px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Registering attendance for today
          </p>
          <p className="mt-2 font-medium text-foreground">{today.label}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Icon icon={Clock} size="sm" />
            Check-in window: {today.startTime} – {today.endTime} ({data.conference.timezone})
          </p>

          {today.alreadyMarked ? (
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
              <Icon icon={CheckCircle2} size="sm" />
              You have registered attendance for this day.
            </p>
          ) : today.canCheckIn ? (
            <Button
              variant="primary"
              className="mt-4"
              disabled={checkingIn}
              onClick={handleCheckIn}
            >
              {checkingIn ? "Registering…" : "Register attendance for today"}
            </Button>
          ) : (
            <p className="mt-4 text-sm text-amber-800">
              {today.phase === "before_window"
                ? `Check-in opens at ${today.startTime}.`
                : today.phase === "after_window"
                  ? `Today's window closed at ${today.endTime}.`
                  : "Check-in is not available right now."}
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-md border border-border bg-neutral-50 px-4 py-3 text-sm text-muted-foreground">
          This conference is not scheduled for today. You can still review your attendance record
          below.
        </p>
      )}

      <AttendanceStatsPanel stats={stats} />

      <div>
        <h3 className="text-sm font-semibold text-foreground">Day-by-day record</h3>
        <ul className="mt-3 space-y-2">
          {stats.dayBreakdown.map((day) => (
            <li
              key={day.date}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">
                  Day {day.dayIndex} — {day.date}
                </p>
                <p className="text-xs text-muted-foreground">
                  {day.startTime} – {day.endTime}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  STATUS_CLASS[day.status] ?? STATUS_CLASS.upcoming,
                )}
              >
                {STATUS_LABELS[day.status] ?? day.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {data.marks?.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Check-in log</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {data.marks.map((m) => (
              <li key={m.dayDate}>
                Day {m.dayIndex} ({m.dayDate}) — {formatAdminDate(m.markedAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="border-t border-border pt-8">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Certificate</h3>
        <ConferenceCertificateTab slug={slug} />
      </section>
    </div>
  );
}
