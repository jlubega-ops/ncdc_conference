import { mapPaperForAdmin } from "@/lib/papers/map";

const userSelect = {
  id: true,
  email: true,
  name: true,
  mustChangePassword: true,
  profileData: true,
};

/**
 * @param {any} row
 * @param {{ hasAccessKey?: boolean; lastAccessAt?: Date | string | null }} [extras]
 */
export function mapRegistrationForAdmin(row, extras = {}) {
  const form = row.formData && typeof row.formData === "object" ? row.formData : {};
  const profile =
    row.user?.profileData && typeof row.user.profileData === "object"
      ? row.user.profileData
      : {};
  const accessKeyIssued =
    extras.hasAccessKey ??
    (row.status === "CONFIRMED" && Boolean(row.user));
  const lastAccessAt =
    extras.lastAccessAt !== undefined
      ? extras.lastAccessAt
      : null;
  return {
    id: row.id,
    status: row.status,
    paymentStatus: row.paymentStatus,
    paymentProofFileId: row.paymentProofFileId,
    paymentProofUrl: row.paymentProofFileId
      ? `/api/files/payment-proofs/${encodeURIComponent(row.paymentProofFileId)}`
      : null,
    adminNotes: row.adminNotes,
    improvementRequest: row.improvementRequest,
    reviewedAt: row.reviewedAt,
    registeredAt: row.registeredAt,
    updatedAt: row.updatedAt,
    user: row.user
      ? {
          id: row.user.id,
          email: row.user.email,
          name: row.user.name,
          mustChangePassword: row.user.mustChangePassword,
          profileData: profile,
        }
      : row.user,
    /** Access code has been issued for this conference registration. */
    accountActivated: accessKeyIssued,
    accessKeyIssued,
    /** Last successful access-code sign-in; null if never used. */
    lastAccessAt,
    formData: form,
    displayName:
      form.fullName ||
      [form.firstName, form.lastName].filter(Boolean).join(" ") ||
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      row.user?.name,
    institution: form.institution ?? profile.institution ?? null,
    attendanceMode: form.attendanceMode ?? null,
    subThemes: Array.isArray(form.subThemes) ? form.subThemes : [],
  };
}

/**
 * @param {any} row
 */
export function mapSubmissionForAdmin(row) {
  return mapPaperForAdmin(row);
}

/**
 * @param {any} row
 */
export function mapFeedbackForAdmin(row) {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: row.user,
  };
}

/**
 * @param {any} row
 */
export function mapConferenceAdminForUi(row) {
  return {
    userId: row.user.id,
    email: row.user.email,
    name: row.user.name,
    assignedAt: row.createdAt,
  };
}

export { userSelect };
