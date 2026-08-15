/**
 * @param {string | null | undefined} path
 */
export function conferenceSlugFromPath(path) {
  const match = String(path || "").match(/^\/conferences\/([^/?#]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
