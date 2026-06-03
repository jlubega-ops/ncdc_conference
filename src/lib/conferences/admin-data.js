const userSelect = {
  id: true,
  email: true,
  name: true,
  mustChangePassword: true,
};

/**
 * @param {any} row
 */
export function mapRegistrationForAdmin(row) {
  const form = row.formData && typeof row.formData === "object" ? row.formData : {};
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
    user: row.user,
    accountActivated: row.user ? !row.user.mustChangePassword : false,
    formData: form,
    displayName:
      form.fullName ||
      [form.firstName, form.lastName].filter(Boolean).join(" ") ||
      row.user?.name,
    institution: form.institution ?? null,
    attendanceMode: form.attendanceMode ?? null,
    subThemes: Array.isArray(form.subThemes) ? form.subThemes : [],
  };
}

import { mapPaperForAdmin } from "@/lib/papers/map";

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
