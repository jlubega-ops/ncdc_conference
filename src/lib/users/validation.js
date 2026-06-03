import { validateRegistrationForm } from "@/lib/registration/validation";
import { buildProfilePayload } from "@/lib/users/profile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ASSIGNABLE_ROLES = ["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER", "ATTENDEE"];

/**
 * @param {Record<string, unknown>} data
 */
export function validateAdminCreateUser(data) {
  const errors = {};
  const firstName = String(data.firstName ?? "").trim();
  const middleName = String(data.middleName ?? "").trim();
  const lastName = String(data.lastName ?? "").trim();
  const email = String(data.email ?? "").trim().toLowerCase();
  const gender = String(data.gender ?? "").trim();
  const roles = Array.isArray(data.roles) ? data.roles.filter(Boolean) : [];
  const conferenceIds = Array.isArray(data.conferenceIds)
    ? data.conferenceIds.filter(Boolean)
    : [];

  if (!firstName) errors.firstName = "First name is required.";
  if (!lastName) errors.lastName = "Last name is required.";
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (!gender || !["M", "F"].includes(gender)) errors.gender = "Please select gender.";

  if (roles.length === 0) errors.roles = "Select at least one role.";

  const invalidRoles = roles.filter((r) => !ASSIGNABLE_ROLES.includes(r));
  if (invalidRoles.length) errors.roles = "Invalid role selection.";

  const needsConference = roles.some((r) =>
    ["CONFERENCE_ADMIN", "REVIEWER"].includes(r),
  );
  if (needsConference && conferenceIds.length === 0) {
    errors.conferenceIds = "Select at least one conference for conference-scoped roles.";
  }

  return {
    errors,
    values: {
      firstName,
      middleName: middleName || null,
      lastName,
      email,
      gender,
      roles,
      conferenceIds,
      profile: buildProfilePayload({
        firstName,
        middleName,
        lastName,
        gender,
      }),
    },
  };
}

/**
 * @param {Record<string, unknown>} data
 */
export function validateAdminUpdateUser(data) {
  return validateAdminCreateUser(data);
}

/**
 * @param {Record<string, unknown>} data
 */
export function validateProfileUpdate(data) {
  const { errors, values } = validateRegistrationForm(
    {
      ...data,
      subThemes: [],
      postConferenceEvents: "No",
      hasDisability: "No",
      hasPaymentProof: false,
    },
    { requiresPayment: false, subThemes: [] },
  );

  const allowed = [
    "firstName",
    "middleName",
    "lastName",
    "gender",
    "ageRange",
    "countryCode",
    "telephone",
    "countryOfOrigin",
    "institution",
    "attendanceMode",
  ];
  const filteredErrors = {};
  for (const key of allowed) {
    if (errors[key]) filteredErrors[key] = errors[key];
  }

  return {
    errors: filteredErrors,
    values: buildProfilePayload(values),
  };
}
