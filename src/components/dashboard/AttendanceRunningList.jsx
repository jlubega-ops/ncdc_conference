"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Clock } from "lucide-react";
import { ConferenceImage } from "@/components/ConferenceImage";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export function AttendanceRunningList() {
  const [conferences, setConferences] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/me/attendance");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load conferences.");
      setConferences(data.conferences ?? []);
      setHistory(data.history ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load conferences.");
      setConferences([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading conferences…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  const historyOnly = history.filter((h) => !h.runningToday);

  return (
    <>
      {conferences.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          <p>No conferences are running today for your approved registrations.</p>
          <p className="mt-2">
            Attendance check-in appears here on each scheduled day, during that day&apos;s time
            window.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
      {conferences.map((row) => (
        <li key={row.conference.slug}>
          <Link
            href={`/dashboard/attendance/${row.conference.slug}`}
            className="group flex overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary/40 hover:shadow-sm"
          >
            <div className="relative hidden h-auto w-24 shrink-0 sm:block">
              <ConferenceImage src={row.conference.cardImage} alt={row.conference.title} />
            </div>
            <div className="min-w-0 flex-1 p-4">
              <p className="font-semibold text-foreground group-hover:text-primary">
                {row.conference.title}
              </p>
              {row.today ? (
                <p className="mt-1 text-xs text-primary">{row.today.label}</p>
              ) : null}
              {row.today ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon icon={Clock} size="sm" />
                  {row.today.startTime} – {row.today.endTime}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-primary-light px-2 py-0.5 font-medium text-primary">
                  {row.stats.attended} attended
                </span>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                  {row.stats.missed} missed
                </span>
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-muted-foreground">
                  {row.stats.remaining} left
                </span>
              </div>
              {row.today?.alreadyMarked ? (
                <p className="mt-2 text-xs font-medium text-primary">✓ Today registered</p>
              ) : row.today?.canCheckIn ? (
                <p className={cn("mt-2 text-xs font-medium text-blue-800")}>Check-in open now</p>
              ) : null}
              <Icon
                icon={ChevronRight}
                size="sm"
                className="mt-2 text-muted-foreground group-hover:text-primary"
              />
            </div>
          </Link>
        </li>
      ))}
        </ul>
      )}

      {history.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">Attendance records</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View performance and day-by-day history for all your registered conferences.
          </p>
          <ul className="mt-4 space-y-2">
            {(historyOnly.length > 0 ? historyOnly : history).map((row) => (
              <li key={row.conference.slug}>
                <Link
                  href={`/dashboard/attendance/${row.conference.slug}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:border-primary/40"
                >
                  <div>
                    <p className="font-medium text-foreground">{row.conference.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.stats.attended} attended · {row.stats.missed} missed ·{" "}
                      {row.stats.performanceRate}% performance
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${row.stats.overallProgress}%` }}
                      />
                    </div>
                    <Icon icon={ChevronRight} size="sm" className="text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
