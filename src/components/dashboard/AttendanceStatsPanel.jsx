"use client";

/**
 * @param {{
 *   stats: {
 *     totalDays: number;
 *     attended: number;
 *     missed: number;
 *     remaining: number;
 *     performanceRate: number;
 *     overallProgress: number;
 *   };
 * }} props
 */
export function AttendanceStatsPanel({ stats }) {
  const { attended, missed, remaining, totalDays, performanceRate, overallProgress } = stats;

  const pieTotal = attended + missed;
  const attendedDeg = pieTotal > 0 ? (attended / pieTotal) * 360 : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="text-sm font-semibold text-foreground">Attendance performance</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Based on days that have already passed (excluding upcoming days).
        </p>
        <div className="mt-4 flex items-center gap-6">
          <div
            className="relative h-28 w-28 shrink-0 rounded-full"
            style={{
              background: `conic-gradient(var(--color-primary, #008e51) 0deg ${attendedDeg}deg, #f59e0b ${attendedDeg}deg 360deg)`,
            }}
            aria-hidden
          >
            <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-surface text-center">
              <span className="text-xl font-bold text-primary">{performanceRate}%</span>
              <span className="text-[10px] text-muted-foreground">rate</span>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-primary" />
              Attended ({attended})
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              Missed ({missed})
            </li>
            <li className="text-muted-foreground">
              {attended} of {pieTotal || totalDays} elapsed days
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Overall progress</p>
          <span className="text-sm font-bold text-primary">{overallProgress}%</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {attended} of {totalDays} conference days marked present.
        </p>
        <div className="mt-4 h-4 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, overallProgress)}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-primary-light px-2 py-2">
            <p className="font-bold text-primary">{attended}</p>
            <p className="text-muted-foreground">Attended</p>
          </div>
          <div className="rounded-md bg-amber-50 px-2 py-2">
            <p className="font-bold text-amber-800">{missed}</p>
            <p className="text-muted-foreground">Missed</p>
          </div>
          <div className="rounded-md bg-neutral-50 px-2 py-2">
            <p className="font-bold text-foreground">{remaining}</p>
            <p className="text-muted-foreground">Left</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Total conference days: {totalDays}
        </p>
      </div>
    </div>
  );
}
