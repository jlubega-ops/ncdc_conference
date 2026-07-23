export const CATEGORIES = [
  "Academic",
  "Education",
  "Technology",
  "Health",
  "Research",
  "Innovation",
];

export const LIFECYCLE_STATUS_OPTIONS = [
  { value: "cfp_open", label: "Call for Papers Open" },
  { value: "registration_open", label: "Registration Open" },
  { value: "running", label: "Conference In Progress" },
  { value: "submissions_closed", label: "Submissions Closed" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

export const STATUS_LABELS = Object.fromEntries(
  LIFECYCLE_STATUS_OPTIONS.map((o) => [o.value, o.label]),
);

export const PUBLICATION_LABELS = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
};

export const SPEAKER_TYPES = [
  { value: "normal", label: "Speaker" },
  { value: "keynote", label: "Keynote speaker" },
  { value: "guest", label: "Guest speaker" },
  { value: "host", label: "Host" },
  { value: "mc", label: "MC" },
];

export const SPEAKER_TYPE_LABELS = Object.fromEntries(
  SPEAKER_TYPES.map((o) => [o.value, o.label]),
);

export const FORM_SECTIONS = [
  { id: "basics", label: "Basics" },
  { id: "schedule", label: "Schedule & venue" },
  { id: "registration", label: "Registration" },
  { id: "media", label: "Images" },
  { id: "cfp", label: "Call for papers" },
  { id: "programme", label: "Programme" },
  { id: "speakers", label: "Speakers" },
  { id: "feedback", label: "Feedback" },
  { id: "gifts", label: "Awards & gifts" },
  { id: "faqs", label: "FAQs" },
  { id: "payments", label: "Payments" },
  { id: "contacts", label: "Contacts" },
];

/** How attendees join this conference. */
export const REGISTRATION_MODES = [
  {
    value: "AUTO_APPROVE",
    label: "Auto-approve registration",
    description:
      "Users register online and are approved immediately. They receive an access code by email.",
  },
  {
    value: "MANUAL_APPROVE",
    label: "Manual approval",
    description:
      "Users register online, then an admin must approve. Access code is emailed after approval.",
  },
  {
    value: "OPEN_NO_REGISTRATION",
    label: "Open — no registration",
    description:
      "No registration form or button. Anyone can view the public conference page without signing up.",
  },
  {
    value: "ADMIN_UPLOAD",
    label: "Admin uploads attendee list",
    description:
      "Invite-only. Not listed on the public conferences page. Admins upload attendees from a spreadsheet; each receives an access code to open the event.",
  },
];

export const REGISTRATION_MODE_LABELS = Object.fromEntries(
  REGISTRATION_MODES.map((m) => [m.value, m.label]),
);

export const DEFAULT_PAID_VISIBILITY = {
  viewProgramme: true,
  viewSpeakers: true,
  viewOnlineLinks: false,
};

export const PAID_VISIBILITY_OPTIONS = [
  { key: "viewProgramme", label: "View programme" },
  { key: "viewSpeakers", label: "View speakers" },
  { key: "viewOnlineLinks", label: "View online links" },
];

export const PAYMENT_DETAIL_FIELDS = [
  { key: "accountName", label: "Account name" },
  { key: "accountNumber", label: "Account number" },
  { key: "bankName", label: "Bank name" },
  { key: "bankBranch", label: "Bank branch" },
  { key: "swiftCode", label: "SWIFT code", optional: true },
];
