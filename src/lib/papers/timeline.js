const REVIEW_ACTION_LABELS = {
  approve: "Final approval",
  request_revision: "Revision requested",
  reject: "Rejected",
};

const TYPE_LABELS = {
  initial_submit: "Paper submitted",
  resubmit: "Author resubmitted",
  review: "Review",
  assigned_reviewer: "Reviewer assigned",
};

/**
 * @param {any} submission
 * @returns {Array<Record<string, unknown>>}
 */
export function buildPaperTimeline(submission) {
  if (!submission) return [];

  const entries = [];
  const log = Array.isArray(submission.activityLog) ? submission.activityLog : [];

  for (const raw of log) {
    if (!raw || typeof raw !== "object") continue;
    entries.push({ ...raw });
  }

  const hasReviewInLog = entries.some((e) => e.type === "review");
  if (!hasReviewInLog && (submission.reviewNotes || submission.improvementRequest)) {
    entries.push({
      type: "review",
      action: submission.status === "ACCEPTED" ? "approve" : "legacy",
      at: submission.reviewedAt ?? submission.updatedAt ?? submission.createdAt,
      reviewNotes: submission.reviewNotes ?? null,
      improvementRequest: submission.improvementRequest ?? null,
      legacy: true,
    });
  }

  return entries.sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : 0;
    const tb = b.at ? new Date(b.at).getTime() : 0;
    return tb - ta;
  });
}

/**
 * @param {Record<string, unknown>} entry
 */
export function getTimelineEntryTitle(entry) {
  if (entry.type === "review") {
    const action = entry.action;
    if (typeof action === "string" && REVIEW_ACTION_LABELS[action]) {
      return REVIEW_ACTION_LABELS[action];
    }
    return TYPE_LABELS.review;
  }
  return TYPE_LABELS[entry.type] ?? String(entry.type ?? "Event");
}

/**
 * @param {Record<string, unknown>} entry
 */
export function getTimelineEntrySummary(entry) {
  if (entry.type === "review") {
    if (entry.improvementRequest) return String(entry.improvementRequest);
    if (entry.reviewNotes) return String(entry.reviewNotes);
  }
  if (entry.type === "assigned_reviewer" && entry.reviewerEmail) {
    return String(entry.reviewerEmail);
  }
  if (entry.type === "resubmit") {
    const parts = [];
    if (entry.previousTitle) parts.push(`Updated from “${entry.previousTitle}”`);
    if (entry.fileReplaced || entry.newFileId) parts.push("New file uploaded");
    if (entry.titleChanged && !entry.previousTitle) parts.push("Title updated");
    return parts.join(" · ") || "Revised submission sent";
  }
  return "";
}
