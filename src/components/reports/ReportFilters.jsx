"use client";

import { cn } from "@/lib/cn";

/**
 * @param {{
 *   conferences: Array<{ id: string; title: string }>;
 *   conferenceId: string;
 *   onConferenceChange: (id: string) => void;
 *   period: string;
 *   onPeriodChange: (p: string) => void;
 *   registrationStatus: string;
 *   onRegistrationStatusChange: (s: string) => void;
 *   showRegistrationFilter?: boolean;
 *   role: string;
 * }} props
 */
export function ReportFilters({
  conferences,
  conferenceId,
  onConferenceChange,
  period,
  onPeriodChange,
  registrationStatus,
  onRegistrationStatusChange,
  showRegistrationFilter = true,
  role,
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Filters
      </p>
      <div className="flex flex-wrap gap-4">
        <FilterField label="Conference">
          <select
            value={conferenceId}
            onChange={(e) => onConferenceChange(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:min-w-[200px] sm:w-auto"
          >
            {conferences.length > 1 ? (
              <option value="all">All in scope ({conferences.length})</option>
            ) : null}
            {conferences.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </FilterField>

        {role !== "REVIEWER" ? (
          <FilterField label="Time period">
            <select
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-auto"
            >
              <option value="all">All time</option>
              <option value="30">Last 30 days</option>
              <option value="7">Last 7 days</option>
            </select>
          </FilterField>
        ) : null}

        {showRegistrationFilter && role !== "REVIEWER" ? (
          <FilterField label="Registration status">
            <select
              value={registrationStatus}
              onChange={(e) => onRegistrationStatusChange(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-auto"
            >
              <option value="all">All statuses</option>
              <option value="CONFIRMED">Approved only</option>
              <option value="PENDING">Pending only</option>
              <option value="NEEDS_REVISION">Needs revision</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </FilterField>
        ) : null}
      </div>
    </div>
  );
}

/**
 * @param {{ label: string; children: React.ReactNode }} props
 */
function FilterField({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
