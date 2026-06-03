const userSelect = {
  id: true,
  email: true,
  name: true,
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
    paymentProofUrl: row.paymentProofUrl,
    notes: row.notes,
    registeredAt: row.registeredAt,
    updatedAt: row.updatedAt,
    user: row.user,
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

/**
 * @param {any} row
 */
export function mapSubmissionForAdmin(row) {
  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    fileUrl: row.fileUrl,
    status: row.status,
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: row.user,
  };
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
