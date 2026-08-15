import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 10 * 60 * 1000;

/** @type {{ at: number; items: string[] } | null} */
let cache = null;

function collectOrganisation(set, value) {
  const label = String(value || "").trim();
  if (label) set.add(label);
}

/**
 * Unique organisation / institution names already stored on users and registrations.
 * Cached so add-attendee suggestions do not hit the DB on every keystroke.
 */
export async function listKnownOrganisations() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.items;
  }

  const [users, registrations] = await Promise.all([
    prisma.user.findMany({ select: { profileData: true } }),
    prisma.conferenceRegistration.findMany({ select: { formData: true } }),
  ]);

  const set = new Set();
  for (const user of users) {
    const profile =
      user.profileData && typeof user.profileData === "object" ? user.profileData : {};
    collectOrganisation(set, profile.institution);
    collectOrganisation(set, profile.organisation);
  }
  for (const row of registrations) {
    const form = row.formData && typeof row.formData === "object" ? row.formData : {};
    collectOrganisation(set, form.institution);
    collectOrganisation(set, form.organisation);
  }

  const items = [...set].sort((a, b) => a.localeCompare(b));
  cache = { at: now, items };
  return items;
}

export function rememberOrganisation(value) {
  const label = String(value || "").trim();
  if (!label || !cache) return;
  if (!cache.items.some((item) => item.toLowerCase() === label.toLowerCase())) {
    cache.items = [...cache.items, label].sort((a, b) => a.localeCompare(b));
  }
}
