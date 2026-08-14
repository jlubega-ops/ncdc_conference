/** Brand assets in /public/assets */
export const brandAssets = {
  logo: "/assets/logo.png",
  building: "/assets/bg_image.jpg",
};

/**
 * Default card/cover image when a conference has none set.
 * Per-conference uploads: /public/assets/conferences/{slug}/card.jpg
 */
export const defaultConferenceImage = brandAssets.building;

/** Old default filename removed from public/assets */
const LEGACY_DEFAULT_IMAGES = new Set(["/assets/ncdc_image.jpg"]);

/**
 * Runtime uploads are not in the Next.js build `public/` folder.
 * @param {string} src
 */
export function isRuntimeUploadSrc(src) {
  return src.startsWith("/uploads/");
}

/**
 * Resolve a conference/speaker image URL, remapping removed defaults.
 * @param {string | null | undefined} src
 */
export function resolveConferenceImageSrc(src) {
  const value = typeof src === "string" ? src.trim() : "";
  if (!value || LEGACY_DEFAULT_IMAGES.has(value)) {
    return defaultConferenceImage;
  }
  return value;
}
