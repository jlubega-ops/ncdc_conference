/**
 * Display labels for who registered an attendee or issued gifts.
 */

/**
 * @param {{ name?: string | null; email?: string | null } | null | undefined} user
 */
export function actorDisplayName(user) {
  if (!user) return null;
  const name = String(user.name || "").trim();
  if (name) return name;
  const email = String(user.email || "").trim();
  if (email && !email.endsWith("@ncdc.local")) return email;
  return null;
}

/**
 * @param {{
 *   registeredBySource?: string | null;
 *   registeredById?: string | null;
 *   userId?: string | null;
 *   registeredBy?: { id?: string; name?: string | null; email?: string | null } | null;
 * }} row
 */
export function formatRegisteredByLabel(row) {
  if (!row) return "—";
  const source = String(row.registeredBySource || "").toUpperCase();
  const name = actorDisplayName(row.registeredBy);
  const isSelf =
    source === "SELF" ||
    (row.registeredById && row.userId && row.registeredById === row.userId);

  if (isSelf) return "Self";
  if (source === "UPLOAD") return name ? `Upload (${name})` : "CSV upload";
  if (source === "ADMIN") return name || "Admin";
  if (name) return name;
  return "—";
}

/**
 * @param {{ name?: string | null; email?: string | null } | null | undefined} issuedBy
 */
export function formatIssuedByLabel(issuedBy) {
  return actorDisplayName(issuedBy) || "—";
}
