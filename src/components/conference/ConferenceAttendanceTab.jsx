"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import {
  AttendancePerformanceCard,
  AttendanceProgressCard,
} from "@/components/dashboard/AttendanceStatsPanel";
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
 * @param {{ slug: string; conferenceHomeHref?: string }} props
 */
export function ConferenceAttendanceTab({ slug, conferenceHomeHref }) {
  const router = useRouter();
  const homeHref = conferenceHomeHref || `/conferences/${slug}`;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState("");
  /** @type {["prompt" | "already" | "success" | null, Function]} */
  const [dialog, setDialog] = useState(null);

  const goHome = useCallback(() => {
    router.push(homeHref);
  }, [homeHref, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/me/attendance/${slug}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load attendance.");
      setData(json);

      const today = json.today;
      if (json.runningToday && today) {
        if (today.alreadyMarked) {
          setDialog("already");
        } else if (today.canCheckIn) {
          setDialog("prompt");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load attendance.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data load
    void load();
  }, [load]);

  async function handleCheckIn() {
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/me/attendance/${slug}/check-in`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Check-in failed.");
      toast.success("Attendance registered for today.");
      setData(json);
      setDialog("success");
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
  const attendanceAllowed = data.conference?.attendanceAllowed !== false;
  const certificatesAllowed = Boolean(data.conference?.certificatesAllowed);

  if (!attendanceAllowed && !certificatesAllowed) {
    return (
      <p className="rounded-md border border-border bg-neutral-50 px-4 py-3 text-sm text-foreground">
        Attendance is not allowed for this conference.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {!attendanceAllowed ? (
        <p className="rounded-md border border-border bg-neutral-50 px-4 py-3 text-sm text-foreground">
          Attendance is not allowed for this conference.
        </p>
      ) : runningToday && today ? (
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
              onClick={() => setDialog("prompt")}
            >
              Register attendance for today
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

      {attendanceAllowed ? (
        <>
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

          <AttendancePerformanceCard stats={stats} />

          <AttendanceProgressCard stats={stats} />

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
        </>
      ) : null}

      {certificatesAllowed ? (
        <section className={cn(attendanceAllowed && "border-t border-border pt-8")}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Certificate</h3>
          <ConferenceCertificateTab slug={slug} />
        </section>
      ) : null}

      <Modal
        open={dialog === "prompt"}
        onClose={() => setDialog(null)}
        title="Attendance for today"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/90">
            You have not registered attendance for today
            {today?.label ? (
              <>
                {" "}
                (<span className="font-medium">{today.label}</span>)
              </>
            ) : null}
            . Take attendance now?
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" disabled={checkingIn} onClick={goHome}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={checkingIn}
              onClick={handleCheckIn}
              className="sm:min-w-[10rem]"
            >
              {checkingIn ? "Registering…" : "Take attendance"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={dialog === "already"}
        onClose={() => setDialog(null)}
        title="Already checked in"
      >
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm text-foreground/90">
            <Icon icon={CheckCircle2} size="md" className="mt-0.5 shrink-0 text-primary" />
            <span>You have already taken attendance for today. What would you like to do next?</span>
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Stay here
            </Button>
            <Button variant="secondary" onClick={goHome} icon={ArrowLeft}>
              Conference home
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={dialog === "success"}
        onClose={() => setDialog(null)}
        title="Attendance registered"
      >
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm text-foreground/90">
            <Icon icon={CheckCircle2} size="md" className="mt-0.5 shrink-0 text-primary" />
            <span>
              Your attendance for today has been recorded successfully. Go back to the dashboard or
              stay on this page?
            </span>
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Stay here
            </Button>
            <Button variant="secondary" onClick={goHome} icon={ArrowLeft}>
              Conference home
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
