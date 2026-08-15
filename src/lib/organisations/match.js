/**
 * Organisation autocomplete helpers (client-safe, no I/O).
 */

export function normalizeOrganisation(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function organisationAcronym(value) {
  return String(value || "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toLowerCase();
}

/**
 * Rank known organisations against a typed query (acronym + fuzzy).
 * @param {string} query
 * @param {string[]} organisations
 * @param {number} [limit]
 */
export function rankOrganisationMatches(query, organisations, limit = 8) {
  const raw = String(query || "").trim();
  if (raw.length < 1) return [];
  const nq = normalizeOrganisation(raw);
  if (!nq) return [];

  /** @type {Array<{ org: string; score: number }>} */
  const scored = [];
  const seen = new Set();

  for (const org of organisations) {
    const label = String(org || "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const n = normalizeOrganisation(label);
    const acr = organisationAcronym(label);
    let score = 0;
    if (n === nq) score = 100;
    else if (n.startsWith(nq)) score = 85;
    else if (acr === nq) score = 80;
    else if (acr.startsWith(nq) && nq.length >= 2) score = 72;
    else if (n.includes(nq)) score = 60;
    else if (nq.length >= 2 && acr.includes(nq)) score = 50;

    if (score > 0) scored.push({ org: label, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.org.localeCompare(b.org))
    .slice(0, limit)
    .map((row) => row.org);
}
