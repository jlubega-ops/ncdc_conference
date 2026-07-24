export const RESOURCE_TYPES = {
  MATERIAL: "MATERIAL",
  PAPER_TEMPLATE: "PAPER_TEMPLATE",
  PRESENTATION_TEMPLATE: "PRESENTATION_TEMPLATE",
};

/** Category labels aligned with the admin Materials hub (attendee-facing). */
export const RESOURCE_TYPE_LABELS = {
  MATERIAL: "Materials",
  PAPER_TEMPLATE: "Paper templates",
  PRESENTATION_TEMPLATE: "Presentation templates",
};

export const MEMBER_CONTENT_SECTIONS = [
  {
    key: "materials",
    type: RESOURCE_TYPES.MATERIAL,
    title: "Materials",
    description: "Handouts, guides, and general conference files.",
  },
  {
    key: "paperTemplates",
    type: RESOURCE_TYPES.PAPER_TEMPLATE,
    title: "Paper templates",
    description: "Templates for paper submissions.",
  },
  {
    key: "presentationTemplates",
    type: RESOURCE_TYPES.PRESENTATION_TEMPLATE,
    title: "Presentation templates",
    description: "Slide templates for presenters.",
  },
  {
    key: "presentations",
    type: null,
    title: "Speakers & presentations",
    description: "Session slides and speaker presentations.",
  },
];

export const ALLOWED_RESOURCE_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

export const MAX_RESOURCE_BYTES = 15 * 1024 * 1024;
