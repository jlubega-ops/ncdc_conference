import { PAYMENT_DETAIL_FIELDS } from "@/lib/conferences/constants";
import { normalizeContacts, normalizePaymentDetails } from "@/lib/conferences/utils";

/**
 * @param {any} form
 * @returns {Record<string, string>}
 */
export function validateConferenceForPublish(form) {
  const errors = {};

  if (!form.title?.trim()) errors.title = "Title is required.";
  if (!form.description?.trim()) errors.description = "Description is required.";
  if (!form.category?.trim()) errors.category = "Category is required.";
  if (!form.organiserName?.trim()) {
    errors.organiserName = "Organisation / organiser name is required.";
  }
  {
    const shortRaw = String(form.organiserShortName ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (shortRaw.length < 2) {
      errors.organiserShortName = "Organisation short name is required (2+ letters/numbers).";
    }
  }

  if (!form.location?.trim()) errors.location = "Location is required.";
  if (!form.venue?.trim()) errors.venue = "Venue is required.";
  if (!form.timezone?.trim()) errors.timezone = "Timezone is required.";
  const needsRegistrationWindow = !["OPEN_NO_REGISTRATION", "ADMIN_UPLOAD"].includes(
    form.registrationMode,
  );
  if (needsRegistrationWindow) {
    if (!form.registrationOpenAt) {
      errors.registrationOpenAt = "Registration open date is required.";
    }
    if (!form.registrationCloseAt) {
      errors.registrationCloseAt = "Registration close date is required.";
    }
  }

  const days = Array.isArray(form.conferenceDays) ? form.conferenceDays : [];
  if (days.length === 0) {
    errors.conferenceDays = "Add at least one conference day.";
  } else {
    days.forEach((day, index) => {
      if (!day?.date) errors[`conferenceDays.${index}.date`] = "Date is required.";
      if (!day?.startTime) errors[`conferenceDays.${index}.startTime`] = "Start time is required.";
      if (!day?.endTime) errors[`conferenceDays.${index}.endTime`] = "End time is required.";
      if (day?.startTime && day?.endTime && day.startTime >= day.endTime) {
        errors[`conferenceDays.${index}.endTime`] = "End time must be after start time.";
      }
    });
  }

  const allowPapers = Boolean(form.allowPaperSubmissions);
  const cfpOpenAt = allowPapers ? form.cfpOpenAt || null : null;
  const cfpCloseAt = allowPapers ? form.cfpCloseAt || null : null;
  const regOpenAt = form.registrationOpenAt || null;
  const regCloseAt = form.registrationCloseAt || null;
  if (allowPapers) {
    if (!cfpOpenAt) errors.cfpOpenAt = "CFP open date is required when papers are allowed.";
    if (!cfpCloseAt) errors.cfpCloseAt = "CFP close date is required when papers are allowed.";
  }
  if (cfpOpenAt && cfpCloseAt && cfpOpenAt > cfpCloseAt) {
    errors.cfpCloseAt = "CFP close date must be after open date.";
  }
  if (regOpenAt && regCloseAt && regOpenAt > regCloseAt) {
    errors.registrationCloseAt = "Registration close date must be after open date.";
  }

  if (!form.cardImage?.trim()) {
    errors.cardImage = "Card image is required.";
  }

  const contacts = normalizeContacts(form.contacts);
  if (contacts.emails.length === 0) {
    errors["contacts.emails"] = "Add at least one contact email.";
  }
  if (!contacts.phone) {
    errors["contacts.phone"] = "Contact telephone is required.";
  }

  if (form.requiresPayment) {
    const payment = normalizePaymentDetails(form.paymentDetails);
    for (const field of PAYMENT_DETAIL_FIELDS) {
      if (field.optional) continue;
      if (!payment[field.key]) {
        errors[`paymentDetails.${field.key}`] =
          `${field.label} is required when payment is enabled.`;
      }
    }
  }

  return errors;
}

/**
 * @param {any} form
 * @param {"DRAFT"|"PUBLISHED"} mode
 */
export function validateConferenceForm(form, mode = "PUBLISHED") {
  const errors = {};
  if (!form.title?.trim()) errors.title = "Title is required.";
  if (mode === "DRAFT") return errors;
  return { ...errors, ...validateConferenceForPublish(form) };
}
