import { prisma } from "@/lib/prisma";
import { getProfileFromUser } from "@/lib/users/profile";
import { userGiftRecipientKey } from "@/lib/gifts/settings";
import {
  deleteUserAndRelatedData,
  isOrphanAttendeeOnly,
} from "@/lib/users/orphan-attendee";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} value
 */
function normalizeNamePart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * @param {string | null | undefined} email
 */
export function isPlaceholderEmail(email) {
  return String(email || "")
    .toLowerCase()
    .endsWith("@ncdc.local");
}

/**
 * @param {string | null | undefined} email
 */
function normalizeRealEmail(email) {
  const value = String(email || "")
    .trim()
    .toLowerCase();
  if (!value || !EMAIL_RE.test(value) || isPlaceholderEmail(value)) return "";
  return value;
}

/**
 * Users who received gifts for this conference but are not on the registration list.
 * @param {string} conferenceId
 */
export async function findGiftsOnlyUsersForConference(conferenceId) {
  const issuances = await prisma.conferenceGiftIssuance.findMany({
    where: { conferenceId, userId: { not: null } },
    select: { userId: true },
  });
  const userIds = [...new Set(issuances.map((row) => row.userId).filter(Boolean))];
  if (userIds.length === 0) return [];

  const registrations = await prisma.conferenceRegistration.findMany({
    where: { conferenceId, userId: { in: userIds } },
    select: { userId: true },
  });
  const registered = new Set(registrations.map((row) => row.userId));
  const giftsOnlyIds = userIds.filter((id) => !registered.has(id));
  if (giftsOnlyIds.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: giftsOnlyIds } },
    include: { roles: true },
  });
}

/**
 * @param {{
 *   conferenceId: string;
 *   email?: string | null;
 *   firstName?: string | null;
 *   lastName?: string | null;
 *   institution?: string | null;
 * }} params
 */
export async function findReusableConferenceUser({
  conferenceId,
  email,
  firstName,
  lastName,
  institution,
}) {
  const realEmail = normalizeRealEmail(email);

  if (realEmail) {
    const byEmail = await prisma.user.findUnique({
      where: { email: realEmail },
      include: { roles: true },
    });
    if (byEmail) return { user: byEmail, match: "email" };
  }

  const giftsOnly = await findGiftsOnlyUsersForConference(conferenceId);
  const first = normalizeNamePart(firstName);
  const last = normalizeNamePart(lastName);
  const inst = normalizeNamePart(institution);

  for (const user of giftsOnly) {
    const userEmail = String(user.email || "").toLowerCase();
    if (realEmail && userEmail === realEmail) {
      return { user, match: "gifts_email" };
    }
    const profile = getProfileFromUser(user);
    const firstCand = normalizeNamePart(profile.firstName);
    const lastCand = normalizeNamePart(profile.lastName);
    if (!first || !last || firstCand !== first || lastCand !== last) continue;
    if (inst && profile.institution && normalizeNamePart(profile.institution) !== inst) {
      continue;
    }
    return { user, match: "gifts_name" };
  }

  return { user: null, match: null };
}

/**
 * Move gift issuances from one user onto another for this conference, then
 * delete the leftover account if it only existed for gifts.
 * @param {{ conferenceId: string; fromUserId: string; toUserId: string }} params
 */
export async function mergeGiftIssuancesOntoUser({ conferenceId, fromUserId, toUserId }) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) return;

  const recipientKey = userGiftRecipientKey(toUserId);
  const oldKey = userGiftRecipientKey(fromUserId);
  const oldIssuances = await prisma.conferenceGiftIssuance.findMany({
    where: {
      conferenceId,
      OR: [{ userId: fromUserId }, { recipientKey: oldKey }],
    },
  });

  for (const row of oldIssuances) {
    const existing = await prisma.conferenceGiftIssuance.findUnique({
      where: {
        conferenceId_recipientKey_category: {
          conferenceId,
          recipientKey,
          category: row.category,
        },
      },
    });

    if (existing && existing.id !== row.id) {
      const a = existing.items && typeof existing.items === "object" ? existing.items : {};
      const b = row.items && typeof row.items === "object" ? row.items : {};
      /** @type {Record<string, number>} */
      const merged = { ...a };
      for (const [itemId, qty] of Object.entries(b)) {
        merged[itemId] = Math.max(Number(merged[itemId] || 0), Number(qty || 0));
      }
      await prisma.conferenceGiftIssuance.update({
        where: { id: existing.id },
        data: {
          items: merged,
          userId: toUserId,
          comment: existing.comment || row.comment,
        },
      });
      await prisma.conferenceGiftIssuance.delete({ where: { id: row.id } });
    } else {
      await prisma.conferenceGiftIssuance.update({
        where: { id: row.id },
        data: { userId: toUserId, recipientKey },
      });
    }
  }

  const leftoverGifts = await prisma.conferenceGiftIssuance.count({
    where: { userId: fromUserId },
  });
  if (leftoverGifts > 0) return;

  const stillRegistered = await prisma.conferenceRegistration.count({
    where: { userId: fromUserId },
  });
  if (stillRegistered > 0) return;

  if (await isOrphanAttendeeOnly(fromUserId, { excludingConferenceIds: [conferenceId] })) {
    await deleteUserAndRelatedData(fromUserId);
  }
}

/**
 * Reuse a gifts-only (or email-matched) user when this person is later registered.
 * @param {{
 *   conferenceId: string;
 *   email?: string | null;
 *   firstName?: string | null;
 *   lastName?: string | null;
 *   institution?: string | null;
 * }} params
 * @returns {Promise<{ user: any | null; isNewUser: boolean; match: string | null }>}
 */
export async function adoptUserForConferencePerson(params) {
  const realEmail = normalizeRealEmail(params.email);
  const reused = await findReusableConferenceUser(params);
  if (!reused.user) {
    return { user: null, isNewUser: true, match: null };
  }

  let user = reused.user;

  if (realEmail && isPlaceholderEmail(user.email)) {
    const taken = await prisma.user.findUnique({
      where: { email: realEmail },
      include: { roles: true },
    });
    if (taken && taken.id !== user.id) {
      await mergeGiftIssuancesOntoUser({
        conferenceId: params.conferenceId,
        fromUserId: user.id,
        toUserId: taken.id,
      });
      user = taken;
    } else if (!taken) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { email: realEmail },
        include: { roles: true },
      });
    }
  }

  if (reused.match === "email" || reused.match === "gifts_email") {
    const nameMatch = await findReusableConferenceUser({
      conferenceId: params.conferenceId,
      firstName: params.firstName,
      lastName: params.lastName,
      institution: params.institution,
    });
    if (nameMatch.user && nameMatch.user.id !== user.id) {
      await mergeGiftIssuancesOntoUser({
        conferenceId: params.conferenceId,
        fromUserId: nameMatch.user.id,
        toUserId: user.id,
      });
    }
  }

  return { user, isNewUser: false, match: reused.match };
}

/**
 * @param {string} userId
 * @param {string} [conferenceId]
 */
export async function userHasGiftIssuances(userId, conferenceId) {
  return prisma.conferenceGiftIssuance.count({
    where: {
      userId,
      ...(conferenceId ? { conferenceId } : {}),
    },
  });
}
