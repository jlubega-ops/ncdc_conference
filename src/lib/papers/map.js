/**
 * @param {any} row
 */
export function getPaperFileRef(row) {
  if (row?.fileId) return row.fileId;
  const url = row?.fileUrl;
  if (url && !url.startsWith("http") && !url.startsWith("/")) {
    return url;
  }
  return null;
}

/**
 * @param {any} row
 */
export function getPaperDownloadUrl(row) {
  const ref = getPaperFileRef(row);
  if (ref) {
    return `/api/files/paper-submissions/${encodeURIComponent(ref)}`;
  }
  const url = row?.fileUrl;
  if (url && (url.startsWith("http") || url.startsWith("/"))) {
    return url;
  }
  return null;
}

/**
 * @param {any} row
 */
export function mapPaperForAuthor(row) {
  const activityLog = Array.isArray(row.activityLog) ? row.activityLog : [];
  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    status: row.status,
    reviewNotes: row.reviewNotes,
    improvementRequest: row.improvementRequest,
    reviewedAt: row.reviewedAt,
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    fileUrl: getPaperDownloadUrl(row),
    authorHasUnreadFeedback: Boolean(row.authorHasUnreadFeedback),
    isFinalApproved: Boolean(row.isFinalApproved),
    activityLog,
    conference: row.conference,
  };
}

/**
 * @param {any} row
 */
export function mapPaperForAdmin(row) {
  const activityLog = Array.isArray(row.activityLog) ? row.activityLog : [];
  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    fileUrl: getPaperDownloadUrl(row),
    reviewNotes: row.reviewNotes,
    improvementRequest: row.improvementRequest,
    reviewedAt: row.reviewedAt,
    reviewedById: row.reviewedById,
    status: row.status,
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isFinalApproved: Boolean(row.isFinalApproved),
    authorHasUnreadFeedback: Boolean(row.authorHasUnreadFeedback),
    activityLog,
    user: row.user,
    assignedReviewer: row.assignedReviewer
      ? {
          id: row.assignedReviewer.id,
          email: row.assignedReviewer.email,
          name: row.assignedReviewer.name,
        }
      : null,
  };
}
