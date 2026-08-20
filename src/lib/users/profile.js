import { GENDER_OPTIONS } from "@/lib/registration/constants";

/** Fields stored on the user profile (not conference-specific). */
export const PROFILE_FIELD_KEYS = [
  "firstName",
  "middleName",
  "lastName",
  "gender",
  "ageRange",
  "countryCode",
  "telephone",
  "countryOfOrigin",
  "institution",
];

/**
 * @param {unknown} profileData
 */
export function parseProfileData(profileData) {
  if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) {
    return {};
  }
  return profileData;
}

/**
 * @param {any} user
 */
export function getProfileFromUser(user) {
  const raw = parseProfileData(user?.profileData);
  const firstName = raw.firstName ?? "";
  const middleName = raw.middleName ?? "";
  const lastName = raw.lastName ?? "";
  const fullName =
    raw.fullName ||
    [firstName, middleName, lastName].filter(Boolean).join(" ") ||
    user?.name ||
    "";

  return {
    firstName,
    middleName,
    lastName,
    gender: raw.gender ?? "",
    ageRange: raw.ageRange ?? "",
    countryCode: raw.countryCode ?? "+256",
    telephone: raw.telephone ?? "",
    countryOfOrigin: raw.countryOfOrigin ?? "Uganda",
    institution: raw.institution ?? "",
    fullName,
  };
}

/**
 * @param {Record<string, unknown>} values
 */
export function buildProfilePayload(values) {
  const firstName = String(values.firstName ?? "").trim();
  const middleName = String(values.middleName ?? "").trim();
  const lastName = String(values.lastName ?? "").trim();
  return {
    firstName,
    middleName: middleName || null,
    lastName,
    gender: String(values.gender ?? "").trim(),
    ageRange: String(values.ageRange ?? "").trim(),
    countryCode: String(values.countryCode ?? "").trim(),
    telephone: String(values.telephone ?? "").trim(),
    countryOfOrigin: String(values.countryOfOrigin ?? "").trim(),
    institution: String(values.institution ?? "").trim(),
    fullName: [firstName, middleName, lastName].filter(Boolean).join(" "),
  };
}

/**
 * Merge registration form with stored user profile (profile fills gaps).
 * @param {any} user
 * @param {Record<string, unknown>} formValues
 */
export function mergeRegistrationWithProfile(user, formValues) {
  const profile = getProfileFromUser(user);
  const merged = { ...formValues };

  for (const key of PROFILE_FIELD_KEYS) {
    const formVal = merged[key];
    const profileVal = profile[key];
    if (
      (formVal === undefined || formVal === null || formVal === "") &&
      profileVal
    ) {
      merged[key] = profileVal;
    }
  }

  merged.email = merged.email || user.email;
  merged.fullName = buildProfilePayload(merged).fullName;
  return merged;
}

/**
 * @param {any} user
 */
export function mapUserForAdminList(user) {
  const profile = getProfileFromUser(user);
  const roles = user.roles ?? [];
  return {
    id: user.id,
    email: user.email,
    name: user.name || profile.fullName,
    profile,
    mustChangePassword: Boolean(user.mustChangePassword),
    temporaryPassword: user.mustChangePassword ? user.temporaryPassword || null : null,
    createdAt: user.createdAt,
    roles: roles.map((r) => ({
      role: r.role,
      conferenceId: r.conferenceId,
      conference: r.conference
        ? { id: r.conference.id, title: r.conference.title, slug: r.conference.slug }
        : null,
    })),
    accountActivated: !user.mustChangePassword,
  };
}

/**
 * @param {string} gender
 */
export function genderLabel(gender) {
  return GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? gender;
}
