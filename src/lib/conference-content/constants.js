export const RESOURCE_TYPES = {
  MATERIAL: "MATERIAL",
  PAPER_TEMPLATE: "PAPER_TEMPLATE",
  PRESENTATION_TEMPLATE: "PRESENTATION_TEMPLATE",
};

export const RESOURCE_TYPE_LABELS = {
  MATERIAL: "Material",
  PAPER_TEMPLATE: "Paper template",
  PRESENTATION_TEMPLATE: "Presentation template",
};

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
