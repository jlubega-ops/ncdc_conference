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
  { id: "media", label: "Images" },
  { id: "cfp", label: "Call for papers" },
  { id: "programme", label: "Programme" },
  { id: "speakers", label: "Speakers" },
  { id: "faqs", label: "FAQs" },
  { id: "payments", label: "Payments" },
  { id: "contacts", label: "Contacts" },
];

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
