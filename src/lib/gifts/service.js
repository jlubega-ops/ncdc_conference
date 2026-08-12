import { prisma } from "@/lib/prisma";
import { findAttendanceMarks } from "@/lib/attendance/db";
import { normalizeConferenceDays } from "@/lib/attendance/utils";
import { normalizeSpeaker } from "@/lib/conferences/utils";
import { getProfileFromUser } from "@/lib/users/profile";
import {
  GIFT_CATEGORY_PARTICIPANTS,
  countIssuedGiftProgress,
  describeIssuedGiftItems,
  getEnabledGiftCategories,
  normalizeGiftsSettings,
  parseGiftRecipientKey,
  speakerGiftRecipientKey,
  sumIssuedItemCounts,
  userGiftRecipientKey,
} from "@/lib/gifts/settings";

function emptyItemCounts(catalog) {
  return (Array.isArray(catalog) ? catalog : []).map((item) => {
    const stock = Math.max(0, Number(item.stock) || 0);
    return {
      id: item.id,
      name: item.name,
      count: 0,
      stock,
      remaining: stock,
    };
  });
}

/**
 * @param {string} conferenceId
 * @param {{ category?: string }} [opts]
 */
export async function getConferenceGiftsAdminData(conferenceId, opts = {}) {
  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) throw new Error("Conference not found.");

  const settings = normalizeGiftsSettings(conference.giftsSettings);
  const enabledCategories = getEnabledGiftCategories(settings);
  const days = normalizeConferenceDays(conference.conferenceDays);
  const totalDays = days.length;

  if (!settings.applicable) {
    return {
      settings,
      enabledCategories: [],
      catalog: [],
      rostersByCategory: {},
      roster: [],
      report: {
        overall: { issued: 0, pending: 0, recipients: 0, itemCounts: [] },
        byCategory: [],
      },
      days: totalDays,
      category: GIFT_CATEGORY_PARTICIPANTS,
      conference: { id: conference.id, title: conference.title, slug: conference.slug },
    };
  }

  const category =
    opts.category && enabledCategories.some((c) => c.value === opts.category)
      ? opts.category
      : enabledCategories[0]?.value || GIFT_CATEGORY_PARTICIPANTS;

  const [issuances, registrations, accessKeys] = await Promise.all([
    prisma.conferenceGiftIssuance.findMany({
      where: { conferenceId },
    }),
    prisma.conferenceRegistration.findMany({
      where: { conferenceId, status: { in: ["CONFIRMED", "PENDING"] } },
      include: {
        user: {
          select: { id: true, email: true, name: true, profileData: true },
        },
      },
      orderBy: { registeredAt: "asc" },
    }),
    prisma.conferenceAccessKey.findMany({
      where: { conferenceId, revokedAt: null },
      select: { userId: true, email: true, displayCode: true },
    }),
  ]);

  const codeByUserId = new Map();
  const codeByEmail = new Map();
  for (const key of accessKeys) {
    if (!key.displayCode) continue;
    if (key.userId) codeByUserId.set(key.userId, key.displayCode);
    if (key.email) codeByEmail.set(key.email.toLowerCase(), key.displayCode);
  }

  const issuanceByRecipientCategory = new Map(
    issuances.map((row) => [`${row.recipientKey}:${row.category}`, row]),
  );

  const marks =
    registrations.length > 0
      ? await findAttendanceMarks(
          {
            conferenceId,
            userId: { in: registrations.map((r) => r.userId) },
          },
          { select: { userId: true, dayDate: true } },
        )
      : [];

  const attendedByUser = new Map();
  for (const mark of marks) {
    attendedByUser.set(mark.userId, (attendedByUser.get(mark.userId) ?? 0) + 1);
  }

  const giftOnlyUserIds = [];
  for (const issuance of issuances) {
    if (issuance.category !== GIFT_CATEGORY_PARTICIPANTS) continue;
    const parsed = parseGiftRecipientKey(issuance.recipientKey);
    if (parsed.type === "user" && parsed.id) {
      const isRegistered = registrations.some((r) => r.userId === parsed.id);
      if (!isRegistered) giftOnlyUserIds.push(parsed.id);
    }
  }
  const giftOnlyUsers =
    giftOnlyUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: [...new Set(giftOnlyUserIds)] } },
          select: { id: true, email: true, name: true, profileData: true },
        })
      : [];
  const giftUsersById = new Map(giftOnlyUsers.map((u) => [u.id, u]));

  // Speakers come from conference speaker details (same as Speakers tab) — they do not register.
  const speakers = (Array.isArray(conference.speakers) ? conference.speakers : [])
    .map((s) => normalizeSpeaker(s))
    .filter(Boolean);

  /**
   * @param {string} cat
   */
  function buildRosterForCategory(cat) {
    if (cat === GIFT_CATEGORY_PARTICIPANTS) {
      const registeredUserIds = new Set(registrations.map((r) => r.userId));
      const rows = registrations.map((reg) => {
        const profile = getProfileFromUser(reg.user);
        const form =
          reg.formData && typeof reg.formData === "object" ? reg.formData : {};
        const recipientKey = userGiftRecipientKey(reg.userId);
        const issuance = issuanceByRecipientCategory.get(`${recipientKey}:${cat}`);
        const issuedItems =
          issuance?.items && typeof issuance.items === "object" ? issuance.items : {};
        const progress = countIssuedGiftProgress(issuedItems, settings.items);
        const issuedItemDetails = describeIssuedGiftItems(issuedItems, settings.items);

        return {
          recipientKey,
          category: cat,
          userId: reg.userId,
          speakerId: null,
          name: profile.fullName || reg.user.name || reg.user.email,
          email: reg.user.email,
          accessCode:
            codeByUserId.get(reg.userId) ||
            codeByEmail.get(reg.user.email?.toLowerCase()) ||
            null,
          telephone: profile.telephone
            ? `${profile.countryCode || ""} ${profile.telephone}`.trim()
            : form.telephone || null,
          registrationStatus: reg.status,
          isConferenceRegistered: true,
          comment: issuance?.comment ?? reg.adminNotes ?? null,
          daysAttended: attendedByUser.get(reg.userId) ?? 0,
          totalDays,
          issuedItems,
          issuedItemDetails,
          progress,
          isIssued: progress.got > 0,
          isFullyIssued: progress.total > 0 && progress.got >= progress.total,
          issuedAt: issuance?.issuedAt ?? null,
        };
      });

      // Gift-only recipients (issued gifts but not registered for this conference).
      for (const issuance of issuances) {
        if (issuance.category !== cat) continue;
        const parsed = parseGiftRecipientKey(issuance.recipientKey);
        if (parsed.type !== "user" || !parsed.id) continue;
        if (registeredUserIds.has(parsed.id)) continue;

        const user = giftUsersById.get(parsed.id);
        const profile = user ? getProfileFromUser(user) : {};
        const issuedItems =
          issuance.items && typeof issuance.items === "object" ? issuance.items : {};
        const progress = countIssuedGiftProgress(issuedItems, settings.items);
        const issuedItemDetails = describeIssuedGiftItems(issuedItems, settings.items);

        rows.push({
          recipientKey: issuance.recipientKey,
          category: cat,
          userId: parsed.id,
          speakerId: null,
          name: profile.fullName || user?.name || user?.email || "Gift recipient",
          email: user?.email?.endsWith("@ncdc.local") ? null : user?.email || null,
          accessCode: null,
          telephone: profile.telephone
            ? `${profile.countryCode || ""} ${profile.telephone}`.trim()
            : null,
          registrationStatus: null,
          isConferenceRegistered: false,
          comment: issuance.comment ?? null,
          daysAttended: attendedByUser.get(parsed.id) ?? 0,
          totalDays,
          issuedItems,
          issuedItemDetails,
          progress,
          isIssued: progress.got > 0,
          isFullyIssued: progress.total > 0 && progress.got >= progress.total,
          issuedAt: issuance.issuedAt ?? null,
        });
      }

      return rows;
    }

    return speakers
      .filter((s) => (s.speakerType || "normal") === cat)
      .map((speaker) => {
        const recipientKey = speakerGiftRecipientKey(speaker.id);
        const issuance = issuanceByRecipientCategory.get(`${recipientKey}:${cat}`);
        const issuedItems =
          issuance?.items && typeof issuance.items === "object" ? issuance.items : {};
        const progress = countIssuedGiftProgress(issuedItems, settings.items);
        const issuedItemDetails = describeIssuedGiftItems(issuedItems, settings.items);
        return {
          recipientKey,
          category: cat,
          userId: null,
          speakerId: speaker.id,
          name: speaker.name,
          email: null,
          telephone: null,
          title: speaker.title || null,
          bio: speaker.bio || null,
          photo: speaker.photo || null,
          speakerType: speaker.speakerType,
          daysAttended: null,
          totalDays,
          issuedItems,
          issuedItemDetails,
          progress,
          isIssued: progress.got > 0,
          isFullyIssued: progress.total > 0 && progress.got >= progress.total,
          issuedAt: issuance?.issuedAt ?? null,
        };
      });
  }

  /** @type {Record<string, any[]>} */
  const rostersByCategory = {};
  for (const cat of enabledCategories) {
    rostersByCategory[cat.value] = buildRosterForCategory(cat.value);
  }

  const byCategory = enabledCategories.map((cat) => {
    const roster = rostersByCategory[cat.value] ?? [];
    let fullyIssued = 0;
    let partiallyIssued = 0;
    for (const row of roster) {
      if (row.isFullyIssued) fullyIssued += 1;
      else if (row.isIssued) partiallyIssued += 1;
    }
    return {
      category: cat.value,
      label: cat.label,
      recipients: roster.length,
      fullyIssued,
      partiallyIssued,
      pending: Math.max(0, roster.length - fullyIssued),
      itemCounts: sumIssuedItemCounts(roster, settings.items),
    };
  });

  const allRosterRows = enabledCategories.flatMap(
    (cat) => rostersByCategory[cat.value] ?? [],
  );

  const overall = byCategory.reduce(
    (acc, row) => {
      acc.recipients += row.recipients;
      acc.issued += row.fullyIssued;
      acc.pending += row.pending;
      return acc;
    },
    {
      recipients: 0,
      issued: 0,
      pending: 0,
      itemCounts: emptyItemCounts(settings.items),
    },
  );
  overall.itemCounts = sumIssuedItemCounts(allRosterRows, settings.items);

  return {
    settings,
    enabledCategories,
    category,
    catalog: settings.items,
    rostersByCategory,
    roster: rostersByCategory[category] ?? [],
    report: { overall, byCategory },
    days: totalDays,
    conference: { id: conference.id, title: conference.title, slug: conference.slug },
  };
}

/**
 * Build CSV for Excel download of gifts issuance.
 * @param {Awaited<ReturnType<typeof getConferenceGiftsAdminData>>} data
 */
export function giftsReportToCsv(data) {
  const lines = [];
  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const catalog = data.catalog ?? [];

  lines.push("Gifts & awards overview");
  lines.push(["Metric", "Value"].map(esc).join(","));
  lines.push(["Conference", data.conference?.title || ""].map(esc).join(","));
  lines.push(["Recipients", data.report?.overall?.recipients ?? 0].map(esc).join(","));
  lines.push(["Fully issued", data.report?.overall?.issued ?? 0].map(esc).join(","));
  lines.push(["Pending", data.report?.overall?.pending ?? 0].map(esc).join(","));
  lines.push("");

  lines.push("Items issued (overall)");
  lines.push(["Item", "Quantity issued", "Total stock", "Remaining"].map(esc).join(","));
  for (const item of data.report?.overall?.itemCounts ?? []) {
    lines.push([item.name, item.count, item.stock ?? "", item.remaining ?? ""].map(esc).join(","));
  }
  lines.push("");

  lines.push("Items issued (by category)");
  lines.push(["Category", "Item", "Quantity issued", "Total stock", "Remaining"].map(esc).join(","));
  for (const cat of data.report?.byCategory ?? []) {
    for (const item of cat.itemCounts ?? []) {
      lines.push(
        [cat.label, item.name, item.count, item.stock ?? "", item.remaining ?? ""].map(esc).join(","),
      );
    }
  }
  lines.push("");

  lines.push("Recipients");
  const header = [
    "Category",
    "Name",
    "Email",
    "Telephone",
    "Title / role",
    "Attendance days",
    "Total days",
    "Status",
    "Items issued",
    "Issued at",
    ...catalog.map((item) => item.name),
  ];
  lines.push(header.map(esc).join(","));

  for (const cat of data.enabledCategories ?? []) {
    const roster = data.rostersByCategory?.[cat.value] ?? [];
    for (const row of roster) {
      const status = row.isFullyIssued
        ? "Fully issued"
        : row.isIssued
          ? "Partially issued"
          : "Pending";
      const itemsLabel = (row.issuedItemDetails || [])
        .map((d) => `${d.name}×${d.quantity}`)
        .join("; ");
      lines.push(
        [
          cat.label,
          row.name,
          row.email || "",
          row.telephone || "",
          row.title || "",
          row.daysAttended ?? "",
          row.totalDays ?? "",
          status,
          itemsLabel,
          row.issuedAt ? new Date(row.issuedAt).toISOString() : "",
          ...catalog.map((item) => Number(row.issuedItems?.[item.id] ?? 0)),
        ]
          .map(esc)
          .join(","),
      );
    }
  }

  return lines.join("\n");
}

/**
 * @param {{
 *   conferenceId: string;
 *   recipientKey: string;
 *   category: string;
 *   items: Record<string, number>;
 *   issuedById?: string | null;
 * }} params
 */
export async function upsertGiftIssuance({
  conferenceId,
  recipientKey,
  category,
  items,
  issuedById = null,
  comment = undefined,
}) {
  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) throw new Error("Conference not found.");

  const settings = normalizeGiftsSettings(conference.giftsSettings);
  if (!settings.applicable) throw new Error("Gifts are not enabled for this conference.");
  if (!settings.categories?.[category]) {
    throw new Error("This gift category is not enabled.");
  }

  const catalogIds = new Set(settings.items.map((i) => i.id));
  /** @type {Record<string, number>} */
  const normalizedItems = {};
  for (const [itemId, qty] of Object.entries(items || {})) {
    if (!catalogIds.has(itemId)) continue;
    const n = Math.max(0, Math.round(Number(qty) || 0));
    if (n > 0) normalizedItems[itemId] = n;
  }

  const parsed = parseGiftRecipientKey(recipientKey);
  const userId = parsed.type === "user" ? parsed.id : null;
  const commentValue =
    comment === undefined ? undefined : String(comment || "").trim() || null;

  return prisma.conferenceGiftIssuance.upsert({
    where: {
      conferenceId_recipientKey_category: {
        conferenceId,
        recipientKey,
        category,
      },
    },
    update: {
      items: normalizedItems,
      userId,
      issuedById: issuedById || undefined,
      ...(commentValue !== undefined ? { comment: commentValue } : {}),
    },
    create: {
      conferenceId,
      recipientKey,
      category,
      items: normalizedItems,
      userId,
      issuedById: issuedById || null,
      comment: commentValue ?? null,
    },
  });
}

/**
 * Add a gifts recipient and issue items.
 * Does NOT register them for the conference unless they are already registered.
 * @param {{
 *   conferenceId: string;
 *   firstName: string;
 *   lastName: string;
 *   email?: string | null;
 *   comment?: string | null;
 *   acknowledged?: boolean;
 *   items?: Record<string, number>;
 *   issuedById?: string | null;
 * }} params
 */
export async function addGiftRecipientAndIssue({
  conferenceId,
  firstName,
  lastName,
  email,
  comment = null,
  acknowledged = false,
  items = {},
  issuedById = null,
}) {
  const { findAttendeeDuplicates } = await import("@/lib/registration/admin-attendee");
  const { buildProfilePayload, getProfileFromUser } = await import("@/lib/users/profile");
  const { randomBytes } = await import("crypto");

  const first = String(firstName || "").trim().replace(/\s+/g, " ");
  const last = String(lastName || "").trim().replace(/\s+/g, " ");
  if (!first || !last) throw new Error("First name and last name are required.");

  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) throw new Error("Conference not found.");

  const settings = normalizeGiftsSettings(conference.giftsSettings);
  if (!settings.applicable) throw new Error("Gifts are not enabled for this conference.");
  if (!settings.categories?.[GIFT_CATEGORY_PARTICIPANTS]) {
    throw new Error("Participants gift category is not enabled for this conference.");
  }

  let normalizedEmail = email ? String(email).trim().toLowerCase() : "";
  const emailProvided = Boolean(normalizedEmail);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailProvided && !EMAIL_RE.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const duplicates = await findAttendeeDuplicates({
    conferenceId,
    firstName: first,
    lastName: last,
    email: normalizedEmail || null,
  });
  const registered = duplicates[0] || null;

  if (!acknowledged) {
    if (registered) {
      return {
        needsConfirmation: true,
        confirmationType: "registered",
        duplicates,
        message:
          "This person is already registered for this conference. Continue to issue gifts to their existing registration? They will not be registered again.",
      };
    }
    return {
      needsConfirmation: true,
      confirmationType: "gifts_only",
      duplicates: [],
      message:
        "This person is not registered for this conference. They will only be added to the gifts list (not registered). You can register them separately later — gift records will remain linked.",
    };
  }

  let userId = registered?.userId || null;

  if (!userId) {
    if (!emailProvided) {
      normalizedEmail = `noemail.${Date.now().toString(36)}.${randomBytes(3).toString("hex")}@ncdc.local`;
    }

    const profile = buildProfilePayload({ firstName: first, lastName: last });
    const fullName = profile.fullName || `${first} ${last}`;

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: fullName,
          profileData: profile,
        },
        include: { roles: true },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: fullName,
          profileData: {
            ...getProfileFromUser(user),
            ...profile,
          },
        },
      });
    }
    userId = user.id;
  }

  const recipientKey = userGiftRecipientKey(userId);
  const issuance = await upsertGiftIssuance({
    conferenceId,
    recipientKey,
    category: GIFT_CATEGORY_PARTICIPANTS,
    items,
    issuedById,
    comment,
  });

  return {
    needsConfirmation: false,
    confirmationType: registered ? "registered" : "gifts_only",
    registered: Boolean(registered),
    registration: null,
    issuance,
    recipientKey,
    message: registered
      ? "Gifts issued to the existing conference registration."
      : "Person added to the gifts list only (not registered for the conference).",
  };
}

/** @deprecated Use addGiftRecipientAndIssue */
export async function addAttendeeAndIssueGifts(params) {
  return addGiftRecipientAndIssue({
    ...params,
    acknowledged: Boolean(params.forceDuplicate || params.acknowledged),
    comment: params.comment,
  });
}
