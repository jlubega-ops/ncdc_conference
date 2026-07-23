"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { LIKERT_LABELS } from "@/lib/feedback/questions";
import { formatAdminDate } from "./AdminTabShell";

/**
 * @param {{ conferenceId: string }} props
 */
export function ConferenceAdminFeedbackTab({ conferenceId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/feedback`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load feedback.");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load feedback.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  function download(format) {
    window.open(
      `/api/admin/conferences/${conferenceId}/feedback?format=${format}`,
      "_blank",
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading feedback report…</p>;
  }
  if (error || !report) {
    return <p className="text-sm text-error">{error || "No feedback data."}</p>;
  }

  const views = [
    { id: "overview", label: "Overall" },
    { id: "days", label: "By day" },
    { id: "questions", label: "Questions" },
    { id: "speakers", label: "Speakers" },
    { id: "participation", label: "Who responded" },
    { id: "submissions", label: "Submissions" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Feedback analytics</h3>
          <p className="text-sm text-foreground/80">
            Live results as responses come in. Anonymous submissions hide identity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => download("excel")}>
            <Icon icon={FileSpreadsheet} size="sm" />
            Excel / CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => download("pdf")}>
            <Icon icon={FileText} size="sm" />
            PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={load}>
            <Icon icon={Download} size="sm" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-foreground">
        <StatInline label="Submissions" value={report.overview.totalSubmissions} />
        <StatInline label="Respondents" value={report.overview.uniqueRespondents} />
        <StatInline label="Not yet responded" value={report.overview.pendingRespondents} />
        <StatInline label="Overall avg" value={`${report.overview.overallAvg}/5`} tone="primary" />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium",
              view === v.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "overview" ? (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h4 className="text-sm font-semibold text-foreground">Rating distribution</h4>
          <ul className="mt-3 space-y-2">
            {report.overview.byRating.map((row) => (
              <li key={row.value} className="flex items-center justify-between text-sm">
                <span>
                  {row.value} — {row.label}
                </span>
                <span className="font-semibold tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view === "days" ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Respondents</th>
                <th className="px-4 py-3">Submissions</th>
                <th className="px-4 py-3">Avg</th>
              </tr>
            </thead>
            <tbody>
              {report.days.map((day) => (
                <tr key={day.date} className="border-t border-border">
                  <td className="px-4 py-3">Day {day.dayIndex}</td>
                  <td className="px-4 py-3">{day.date}</td>
                  <td className="px-4 py-3">{day.uniqueRespondents}</td>
                  <td className="px-4 py-3">{day.submissions}</td>
                  <td className="px-4 py-3 font-medium">{day.avgRating || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {view === "questions" ? (
        <div className="space-y-4">
          {report.questions.map((q) => (
            <div key={`${q.scope}-${q.id}`} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{q.label}</p>
                <p className="text-xs text-muted-foreground">
                  {q.scope} · avg {q.avg} · {q.responses} responses
                </p>
              </div>
              <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                {q.distribution.map((d) => (
                  <li key={d.value} className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {d.value} {LIKERT_LABELS[d.value]}
                    </span>
                    <span>{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {view === "speakers" ? (
        report.speakers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No speaker ratings yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Speaker</th>
                  <th className="px-4 py-3">Ratings</th>
                  <th className="px-4 py-3">Average</th>
                </tr>
              </thead>
              <tbody>
                {report.speakers.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.responses}</td>
                    <td className="px-4 py-3">{s.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {view === "participation" ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Attendee</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Days</th>
              </tr>
            </thead>
            <tbody>
              {report.participation.map((p) => (
                <tr key={p.userId} className="border-t border-border">
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        p.hasAnyFeedback
                          ? "bg-primary-light text-primary"
                          : "bg-amber-50 text-amber-800",
                      )}
                    >
                      {p.hasAnyFeedback ? "Submitted" : "Not yet"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.daysSubmitted}/{p.daysTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {view === "submissions" ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Submitter</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Comment</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {report.submissions.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.user?.name}</p>
                    {row.user?.email ? (
                      <p className="text-xs text-muted-foreground">{row.user.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{row.feedbackType}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.targetKey}</td>
                  <td className="px-4 py-3">{row.rating ?? "—"}</td>
                  <td className="max-w-xs px-4 py-3 text-muted-foreground">
                    {row.comment || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatAdminDate(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
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
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </span>
  );
}
