"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ReportBarChart } from "@/components/reports/ReportBarChart";
import { ReportDonutChart } from "@/components/reports/ReportDonutChart";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportStatCards } from "@/components/reports/ReportStatCards";
import { CHART_COLORS } from "@/lib/reports/charts";
import { ROLE_LABELS } from "@/lib/auth/roles";

/**
 * @param {{ initialRole: string }} props
 */
export function ReportsDashboard({ initialRole }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [conferenceId, setConferenceId] = useState("all");
  const [period, setPeriod] = useState("all");
  const [registrationStatus, setRegistrationStatus] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        conferenceId,
        period,
        registrationStatus,
      });
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load report.");
      setReport(data.report);
      if (data.report?.conferences?.length === 1 && conferenceId === "all") {
        setConferenceId(data.report.conferences[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [conferenceId, period, registrationStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const conferences = report?.conferences ?? [];

  const regStatusSegments = useMemo(() => {
    if (!report?.registrations?.byStatus) return [];
    return report.registrations.byStatus.map((s, i) => ({
      label: s.label,
      value: s.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [report]);

  const genderSegments = useMemo(() => {
    if (!report?.registrations?.byGender) return [];
    return report.registrations.byGender.map((s, i) => ({
      label: s.label,
      value: s.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [report]);

  const paperSegments = useMemo(() => {
    if (!report?.papers?.byStatus) return [];
    return report.papers.byStatus.map((s, i) => ({
      label: s.label,
      value: s.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [report]);

  const modeSegments = useMemo(() => {
    if (!report?.overview?.registrationModes) return [];
    return report.overview.registrationModes.map((s, i) => ({
      label: s.label,
      value: s.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [report]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary-light via-surface to-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <span className="rounded-xl bg-primary p-3 text-primary-foreground">
            <Icon icon={BarChart3} size="md" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-foreground">Reports & analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ROLE_LABELS[initialRole] ?? initialRole} view
              {report?.conferenceTitle ? ` · ${report.conferenceTitle}` : ""}
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {initialRole === "REVIEWER"
                ? "Track papers assigned to you, your review activity, and conference feedback in your scope."
                : "Interactive overview scoped to your conferences. Sections appear only when those features are enabled."}
            </p>
          </div>
        </div>
      </div>

      {conferences.length > 0 ? (
        <ReportFilters
          conferences={conferences}
          conferenceId={conferenceId}
          onConferenceChange={setConferenceId}
          period={period}
          onPeriodChange={setPeriod}
          registrationStatus={registrationStatus}
          onRegistrationStatusChange={setRegistrationStatus}
          showRegistrationFilter={report?.sections?.registrations}
          role={initialRole}
        />
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading report data…</p>
      ) : null}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      {!loading && report ? (
        <>
          {report.summary?.length > 0 ? <ReportStatCards items={report.summary} /> : null}

          {report.sections?.overview && report.overview ? (
            <section className="space-y-4">
              <SectionHeading
                title="Conference portfolio"
                description="How conferences in this scope are configured."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportDonutChart
                  title="Registration modes"
                  segments={modeSegments}
                  centerLabel="conferences"
                />
                <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">Feature coverage</p>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Published / drafts</span>
                      <span className="font-semibold text-foreground">
                        {report.overview.published} / {report.overview.drafts}
                      </span>
                    </li>
                    <li className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">With paper submissions</span>
                      <span className="font-semibold text-foreground">
                        {report.overview.withPapers}
                      </span>
                    </li>
                    <li className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">With gifts & awards</span>
                      <span className="font-semibold text-foreground">
                        {report.overview.withGifts}
                      </span>
                    </li>
                    <li className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">With online streams</span>
                      <span className="font-semibold text-foreground">
                        {report.overview.withStreams}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">With breakout rooms</span>
                      <span className="font-semibold text-foreground">
                        {report.overview.withBreakouts}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          ) : null}

          {report.sections?.registrations && report.registrations ? (
            <section className="space-y-4">
              <SectionHeading
                title="Registrations"
                description={`${report.registrations.filteredTotal} records match filters (${report.registrations.total} total).`}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportDonutChart
                  title="Registration status"
                  segments={regStatusSegments}
                  centerLabel="applications"
                />
                <ReportDonutChart
                  title="Gender distribution"
                  subtitle="Among filtered registrations"
                  segments={genderSegments}
                  centerLabel="people"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportBarChart
                  title="Age ranges"
                  items={report.registrations.byAge.map((a) => ({
                    label: a.label,
                    value: a.value,
                  }))}
                />
                <ReportBarChart
                  title="Mode of attendance"
                  items={report.registrations.byMode.map((m) => ({
                    label: m.label,
                    value: m.value,
                  }))}
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportBarChart
                  title="Countries of origin"
                  subtitle="Top 10"
                  items={report.registrations.byCountry}
                />
                <ReportBarChart
                  title="Institutions"
                  subtitle="Top 8"
                  items={report.registrations.topInstitutions}
                />
              </div>
              {report.registrations.subThemes?.length > 0 ? (
                <ReportBarChart
                  title="Sub-theme interest"
                  items={report.registrations.subThemes}
                />
              ) : null}
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportDonutChart
                  title="Payment verification"
                  segments={report.registrations.paymentStatus.map((s, i) => ({
                    label: s.label,
                    value: s.value,
                    color: CHART_COLORS[i % CHART_COLORS.length],
                  }))}
                  centerLabel="records"
                />
                <ReportBarChart
                  title="Registration trend"
                  subtitle={
                    period === "7"
                      ? "Last 7 days"
                      : period === "30"
                        ? "Last 30 days"
                        : "All time (by day)"
                  }
                  items={report.registrations.trend.map((t) => ({
                    label: t.label.slice(5),
                    value: t.value,
                  }))}
                  vertical={report.registrations.trend.length <= 12}
                />
              </div>
            </section>
          ) : null}

          {report.sections?.papers && report.papers ? (
            <section className="space-y-4">
              <SectionHeading
                title="Paper submissions"
                description={`${report.papers.total} submissions · ${report.papers.finalApproved} final approvals.`}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportDonutChart
                  title="Submission status"
                  segments={paperSegments}
                  centerLabel="papers"
                />
                {report.papers.trend?.length > 0 ? (
                  <ReportBarChart
                    title="Submissions over time"
                    items={report.papers.trend.map((t) => ({
                      label: t.label.slice(5),
                      value: t.value,
                    }))}
                    vertical
                  />
                ) : (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 text-sm text-muted-foreground">
                    Submission timeline will appear as papers are submitted.
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {report.sections?.feedback && report.feedback ? (
            <section className="space-y-4">
              <SectionHeading
                title="Evaluations & comments"
                description={
                  report.feedback.withRating > 0
                    ? `Average rating ${report.feedback.avgRating} / 5 from ${report.feedback.withRating} ratings.`
                    : `${report.feedback.total} feedback entries.`
                }
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">Satisfaction score</p>
                  <p className="mt-4 text-5xl font-bold text-primary">
                    {report.feedback.avgRating}
                    <span className="text-lg font-normal text-muted-foreground"> / 5</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {report.feedback.total} total responses
                  </p>
                  {report.feedback.byType?.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm">
                      {report.feedback.byType.map((row) => (
                        <li key={row.key} className="flex justify-between border-t border-border pt-2">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-semibold text-foreground">{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <ReportBarChart title="Rating distribution" items={report.feedback.byRating} />
              </div>
            </section>
          ) : null}

          {report.sections?.attendance && report.attendance ? (
            <section className="space-y-4">
              <SectionHeading
                title="Attendance & certificates"
                description="Daily check-ins and certificates issued for conferences with scheduled days."
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total check-ins" value={report.attendance.totalCheckIns} />
                <MetricCard label="Unique attendees" value={report.attendance.uniqueAttendees} />
                <MetricCard
                  label="Certificates issued"
                  value={report.attendance.certificates?.issued ?? 0}
                />
                <MetricCard
                  label="Certificates emailed"
                  value={report.attendance.certificates?.emailed ?? 0}
                />
              </div>
              {report.attendance.byDay?.length > 0 ? (
                <ReportBarChart
                  title="Check-ins by day"
                  items={report.attendance.byDay.map((d) => ({
                    label: d.label.slice(5),
                    value: d.value,
                  }))}
                  vertical={report.attendance.byDay.length <= 10}
                />
              ) : null}
            </section>
          ) : null}

          {report.sections?.gifts && report.gifts ? (
            <section className="space-y-4">
              <SectionHeading
                title="Gifts & awards"
                description={`${report.gifts.conferencesWithGifts} conference(s) with gifts enabled · ${report.gifts.issuances} issuance records.`}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard label="Fully issued" value={report.gifts.fullyIssued} />
                <MetricCard label="Partially issued" value={report.gifts.partiallyIssued} />
                <MetricCard label="Issuance records" value={report.gifts.issuances} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {report.gifts.byCategory?.length > 0 ? (
                  <ReportBarChart
                    title="Issuances by category"
                    items={report.gifts.byCategory.map((c) => ({
                      label: c.label,
                      value: c.value,
                    }))}
                  />
                ) : (
                  <EmptyPanel text="No gift issuances recorded yet." />
                )}
                {report.gifts.itemCounts?.length > 0 ? (
                  <ReportBarChart
                    title="Items issued"
                    subtitle="Quantity issued across enabled gift catalogs"
                    items={report.gifts.itemCounts.map((item) => ({
                      label:
                        typeof item.remaining === "number"
                          ? `${item.name} (${item.remaining} left)`
                          : item.name,
                      value: item.count,
                    }))}
                  />
                ) : (
                  <EmptyPanel text="No gift catalog items issued yet." />
                )}
              </div>
            </section>
          ) : null}

          {report.sections?.online && report.online ? (
            <section className="space-y-4">
              <SectionHeading
                title="Online streams & breakout rooms"
                description="Configuration health for remote participation links in this scope."
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Conferences with streams" value={report.online.withStreams} />
                <MetricCard label="Stream links" value={report.online.streamEntries} />
                <MetricCard label="Conferences with breakouts" value={report.online.withBreakouts} />
                <MetricCard label="Breakout rooms" value={report.online.breakoutRooms} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {report.online.streamPlatforms?.length > 0 ? (
                  <ReportBarChart
                    title="Stream platforms"
                    items={report.online.streamPlatforms}
                  />
                ) : (
                  <EmptyPanel text="No online streams configured." />
                )}
                {report.online.breakoutPlatforms?.length > 0 ? (
                  <ReportBarChart
                    title="Breakout platforms"
                    items={report.online.breakoutPlatforms}
                  />
                ) : (
                  <EmptyPanel text="No breakout rooms configured." />
                )}
              </div>
            </section>
          ) : null}

          {report.sections?.reviewer && report.reviewer ? (
            <section className="space-y-4">
              <SectionHeading
                title="Your review workload"
                description="Papers assigned to you and reviews you have completed."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportDonutChart
                  title="Assigned papers by status"
                  segments={report.reviewer.byStatus.map((s, i) => ({
                    label: s.label,
                    value: s.value,
                    color: CHART_COLORS[i % CHART_COLORS.length],
                  }))}
                  centerLabel="assigned"
                />
                <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">Review activity</p>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Assigned to you</span>
                      <span className="font-semibold text-foreground">
                        {report.reviewer.assigned}
                      </span>
                    </li>
                    <li className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Awaiting action</span>
                      <span className="font-semibold text-amber-800">
                        {report.reviewer.needsAction}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Reviews completed by you</span>
                      <span className="font-semibold text-primary">
                        {report.reviewer.reviewedByYou}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {!loading && !error && conferences.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          {initialRole === "REVIEWER"
            ? "No papers have been assigned to you yet. Reports will appear when you are assigned as a reviewer."
            : "No conferences in your scope yet. Reports will populate once conferences and data are available."}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {{ title: string; description?: string }} props
 */
function SectionHeading({ title, description }) {
  return (
    <div className="border-b border-border pb-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

/**
 * @param {{ label: string; value: number }} props
 */
function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

/**
 * @param {{ text: string }} props
 */
function EmptyPanel({ text }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
