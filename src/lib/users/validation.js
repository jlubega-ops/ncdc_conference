import { validateRegistrationForm } from "@/lib/registration/validation";
import { buildProfilePayload } from "@/lib/users/profile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Roles that can be set from the Users admin create/edit form. */
export const ADMIN_FORM_ROLES = ["SUPERADMIN", "CONFERENCE_ADMIN"];

/**
 * Roles assigned via conference registration / reviewer assignment — not via create user.
 */
export const CONFERENCE_ASSIGNED_ROLES = ["REVIEWER", "ATTENDEE"];

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
  const rawRoles = Array.isArray(data.roles) ? data.roles.filter(Boolean) : [];
  const conferenceIds = Array.isArray(data.conferenceIds)
    ? data.conferenceIds.filter(Boolean)
    : [];

  if (!firstName) errors.firstName = "First name is required.";
  if (!lastName) errors.lastName = "Last name is required.";
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (!gender || !["M", "F"].includes(gender)) errors.gender = "Please select gender.";

  const requestedAdminRoles = rawRoles.filter((r) => ADMIN_FORM_ROLES.includes(r));

  // Conference Admin without a conference is not assigned.
  const roles = requestedAdminRoles.filter((role) => {
    if (role === "CONFERENCE_ADMIN" && conferenceIds.length === 0) return false;
    return true;
  });

  if (roles.length === 0) {
    errors.roles =
      requestedAdminRoles.includes("CONFERENCE_ADMIN") && conferenceIds.length === 0
        ? "Select at least one conference for Conference Admin, or choose Super Admin."
        : "Select Super Admin and/or Conference Admin (with a conference). Attendee and Reviewer are assigned through conferences.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, values: null };
  }

  return {
    errors: {},
    values: {
      email,
      gender,
      roles,
      conferenceIds,
      profile: buildProfilePayload({
        firstName,
        middleName,
        lastName,
        gender,
        telephone: data.telephone,
        countryCode: data.countryCode,
        countryOfOrigin: data.countryOfOrigin,
        institution: data.institution,
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
  const { errors, values } = validateRegistrationForm(data, { requireEmail: false });
  if (Object.keys(errors).length > 0) {
    return { errors, values: null };
  }
  return {
    errors: {},
    values: {
      profile: buildProfilePayload(values),
    },
  };
}
