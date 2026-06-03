import { AGE_RANGES, ATTENDANCE_MODES, GENDER_OPTIONS } from "@/lib/registration/constants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} phone
 */
export function validateTelephone(phone) {
  const trimmed = (phone ?? "").trim();
  if (!trimmed) return "Telephone is required.";
  if (trimmed.startsWith("0") || trimmed.startsWith("+0")) {
    return "Do not include a leading 0. Enter your number without the trunk prefix.";
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return "Do not include a leading 0. Enter your number without the trunk prefix.";
  }
  if (digits.length < 8 || digits.length > 12) {
    return "Enter a valid telephone number (8–12 digits).";
  }
  return null;
}

/**
 * @param {Record<string, unknown>} data
 * @param {{ requiresPayment: boolean, subThemes: string[] }} options
 * @returns {Record<string, string>}
 */
export function validateRegistrationForm(data, options) {
  const errors = {};
  const firstName = String(data.firstName ?? "").trim();
  const middleName = String(data.middleName ?? "").trim();
  const lastName = String(data.lastName ?? "").trim();
  const email = String(data.email ?? "").trim().toLowerCase();
  const gender = String(data.gender ?? "").trim();
  const ageRange = String(data.ageRange ?? "").trim();
  const countryCode = String(data.countryCode ?? "").trim();
  const telephone = String(data.telephone ?? "").trim();
  const countryOfOrigin = String(data.countryOfOrigin ?? "").trim();
  const institution = String(data.institution ?? "").trim();
  const attendanceMode = String(data.attendanceMode ?? "").trim();
  const subThemesSelected = Array.isArray(data.subThemes) ? data.subThemes.filter(Boolean) : [];
  const expectations = String(data.expectations ?? "").trim();
  const postConferenceEvents = String(data.postConferenceEvents ?? "").trim();
  const hasDisability = String(data.hasDisability ?? "").trim();
  const disabilityDetails = String(data.disabilityDetails ?? "").trim();

  if (!firstName) errors.firstName = "First name is required.";
  if (!lastName) errors.lastName = "Last name is required.";
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  if (!gender || !GENDER_OPTIONS.some((g) => g.value === gender)) {
    errors.gender = "Please select gender.";
  }
  if (!ageRange || !AGE_RANGES.some((a) => a.value === ageRange)) {
    errors.ageRange = "Please select your age range.";
  }

  if (!countryCode) errors.countryCode = "Country code is required.";
  const phoneError = validateTelephone(telephone);
  if (phoneError) errors.telephone = phoneError;

  if (!countryOfOrigin) errors.countryOfOrigin = "Country of origin is required.";
  if (!institution) errors.institution = "Institution is required.";

  if (!attendanceMode || !ATTENDANCE_MODES.some((m) => m.value === attendanceMode)) {
    errors.attendanceMode = "Please select mode of attendance.";
  }

  if (options.subThemes.length > 0) {
    if (subThemesSelected.length < 1) {
      errors.subThemes = "Select at least one sub-theme.";
    } else {
      const invalid = subThemesSelected.filter((t) => !options.subThemes.includes(t));
      if (invalid.length > 0) errors.subThemes = "Invalid sub-theme selection.";
    }
  }

  if (!postConferenceEvents || !["Yes", "No"].includes(postConferenceEvents)) {
    errors.postConferenceEvents = "Please indicate if you wish to attend post-conference events.";
  }

  if (!hasDisability || !["Yes", "No"].includes(hasDisability)) {
    errors.hasDisability = "Please indicate if you have a disability.";
  }
  if (hasDisability === "Yes" && !disabilityDetails) {
    errors.disabilityDetails = "Please specify your disability.";
  }

  if (options.requiresPayment && !data.hasPaymentProof) {
    errors.paymentProof = "Proof of payment is required for this conference.";
  }

  return {
    errors,
    values: {
      firstName,
      middleName: middleName || null,
      lastName,
      email,
      gender,
      ageRange,
      countryCode,
      telephone,
      countryOfOrigin,
      institution,
      attendanceMode,
      subThemes: subThemesSelected,
      expectations: expectations || null,
      postConferenceEvents,
      hasDisability,
      disabilityDetails: hasDisability === "Yes" ? disabilityDetails : null,
      fullName: [firstName, middleName, lastName].filter(Boolean).join(" "),
    },
  };
}
