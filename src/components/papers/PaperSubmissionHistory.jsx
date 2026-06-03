"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatAdminDate } from "@/components/dashboard/admin-tabs/AdminTabShell";
import {
  buildPaperTimeline,
  getTimelineEntrySummary,
  getTimelineEntryTitle,
} from "@/lib/papers/timeline";

/**
 * @param {{
 *   submission: any;
 *   defaultExpanded?: boolean;
 *   className?: string;
 * }} props
 */
export function PaperSubmissionHistory({
  submission,
  defaultExpanded,
  className,
}) {
  const entries = useMemo(() => buildPaperTimeline(submission), [submission]);

  const collapsedByDefault =
    defaultExpanded === undefined
      ? Boolean(submission?.isFinalApproved || submission?.status === "ACCEPTED")
      : !defaultExpanded;

  const [open, setOpen] = useState(!collapsedByDefault);

  if (entries.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        No review history recorded for this submission yet.
      </p>
    );
  }

  return (
    <div className={cn("rounded-md border border-border", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-neutral-50/80"
        aria-expanded={open}
      >
        <Icon
          icon={ChevronDown}
          size="sm"
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
        <span>Submission history</span>
        <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {entries.length}
        </span>
        {!open ? (
          <span className="ml-auto max-w-[55%] truncate text-xs font-normal text-muted-foreground">
            {getTimelineEntryTitle(entries[0])}
            {getTimelineEntrySummary(entries[0])
              ? ` — ${getTimelineEntrySummary(entries[0])}`
              : ""}
          </span>
        ) : null}
      </button>

      {open ? (
        <ul className="max-h-72 space-y-3 overflow-y-auto border-t border-border px-4 py-3">
          {entries.map((entry, i) => (
            <li
              key={`${entry.at ?? "na"}-${entry.type}-${i}`}
              className="rounded-md border border-border/80 bg-neutral-50/50 px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-foreground">{getTimelineEntryTitle(entry)}</p>
                {entry.at ? (
                  <time className="text-xs text-muted-foreground">
                    {formatAdminDate(entry.at)}
                  </time>
                ) : null}
              </div>

              {entry.type === "review" ? (
                <div className="mt-2 space-y-2 text-sm">
                  {entry.improvementRequest ? (
                    <p>
                      <span className="text-xs font-medium text-muted-foreground">
                        Requested improvements:{" "}
                      </span>
                      <span className="text-foreground">{String(entry.improvementRequest)}</span>
                    </p>
                  ) : null}
                  {entry.reviewNotes ? (
                    <p>
                      <span className="text-xs font-medium text-muted-foreground">Comment: </span>
                      <span className="text-foreground">{String(entry.reviewNotes)}</span>
                    </p>
                  ) : null}
                  {!entry.improvementRequest && !entry.reviewNotes ? (
                    <p className="text-xs text-muted-foreground">No additional message.</p>
                  ) : null}
                </div>
              ) : null}

              {entry.type === "resubmit" ? (
                <div className="mt-2 space-y-1 text-sm text-foreground">
                  {entry.previousTitle ? (
                    <p>
                      <span className="text-xs font-medium text-muted-foreground">
                        Previous title:{" "}
                      </span>
                      {String(entry.previousTitle)}
                    </p>
                  ) : null}
                  {entry.fileReplaced || entry.newFileId ? (
                    <p className="text-xs text-muted-foreground">A new paper file was uploaded.</p>
                  ) : null}
                  {entry.titleChanged && !entry.previousTitle ? (
                    <p className="text-xs text-muted-foreground">Paper title was updated.</p>
                  ) : null}
                  {!entry.fileReplaced && !entry.newFileId && !entry.titleChanged && !entry.previousTitle ? (
                    <p className="text-xs text-muted-foreground">
                      Resubmitted with updated content.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {entry.type === "assigned_reviewer" ? (
                <p className="mt-2 text-sm text-foreground">
                  <span className="text-xs font-medium text-muted-foreground">Reviewer: </span>
                  {entry.reviewerEmail ? String(entry.reviewerEmail) : "Assigned"}
                </p>
              ) : null}

              {entry.type === "initial_submit" ? (
                <p className="mt-2 text-xs text-muted-foreground">Initial submission received.</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
