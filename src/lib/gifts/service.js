import { prisma } from "@/lib/prisma";
import { findAttendanceMarks } from "@/lib/attendance/db";
import { getZonedDateTimeParts, normalizeConferenceDays } from "@/lib/attendance/utils";
import { normalizeSpeaker } from "@/lib/conferences/utils";
import { getProfileFromUser } from "@/lib/users/profile";
import { formatIssuedByLabel, formatRegisteredByLabel } from "@/lib/users/actor";
import {
  GIFT_CATEGORIES,
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

function giftCategoryLabel(category) {
  return GIFT_CATEGORIES.find((c) => c.value === category)?.label || category;
}

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
      todayKey: null,
      todayDayIndex: null,
      category: GIFT_CATEGORY_PARTICIPANTS,
      conference: { id: conference.id, title: conference.title, slug: conference.slug },
    };
  }

  const category =
    opts.category && enabledCategories.some((c) => c.value === opts.category)
      ? opts.category
      : enabledCategories[0]?.value || GIFT_CATEGORY_PARTICIPANTS;

  const todayKey = getZonedDateTimeParts(new Date()).dateKey;
  const todayDay = days.find((d) => d.date === todayKey) ?? null;

  const [issuances, registrations, accessKeys] = await Promise.all([
    prisma.conferenceGiftIssuance.findMany({
      where: { conferenceId },
      include: {
        issuedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.conferenceRegistration.findMany({
      where: { conferenceId, status: { in: ["CONFIRMED", "PENDING"] } },
      include: {
        user: {
          select: { id: true, email: true, name: true, profileData: true },
        },
        registeredBy: { select: { id: true, name: true, email: true } },
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
  const attendedTodayByUser = new Set();
  for (const mark of marks) {
    attendedByUser.set(mark.userId, (attendedByUser.get(mark.userId) ?? 0) + 1);
    if (mark.dayDate === todayKey) attendedTodayByUser.add(mark.userId);
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
          issuedByName: formatIssuedByLabel(issuance?.issuedBy),
          registeredByLabel: formatRegisteredByLabel(reg),
          categoryLabel: giftCategoryLabel(cat),
          attendedToday: attendedTodayByUser.has(reg.userId),
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
          issuedByName: formatIssuedByLabel(issuance.issuedBy),
          registeredByLabel: "—",
          categoryLabel: giftCategoryLabel(cat),
          attendedToday: false,
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
          issuedByName: formatIssuedByLabel(issuance?.issuedBy),
          registeredByLabel: "—",
          categoryLabel: giftCategoryLabel(cat),
          attendedToday: false,
          isConferenceRegistered: false,
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
    roster: allRosterRows,
    report: { overall, byCategory },
    days: totalDays,
    todayKey,
    todayDayIndex: todayDay?.dayIndex ?? null,
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
    "Issued by",
    "Registered by",
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
          row.issuedByName || "",
          row.registeredByLabel || "",
          ...catalog.map((item) => Number(row.issuedItems?.[item.id] ?? 0)),
        ]
          .map(esc)
          .join(","),
      );
    }
  }

  return lines.join("\n");
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Summary of gifts issued, grouped by the admin who issued them.
 * @param {string} conferenceId
 */
export async function getGiftIssuersReport(conferenceId) {
  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) throw new Error("Conference not found.");

  const settings = normalizeGiftsSettings(conference.giftsSettings);
  const catalog = settings.items ?? [];
  const issuances = await prisma.conferenceGiftIssuance.findMany({
    where: { conferenceId },
    include: {
      issuedBy: { select: { id: true, name: true, email: true } },
    },
  });

  /** @type {Map<string, any>} */
  const byIssuer = new Map();
  for (const row of issuances) {
    const key = row.issuedById || "_unknown";
    if (!byIssuer.has(key)) {
      byIssuer.set(key, {
        issuerId: row.issuedById,
        name: formatIssuedByLabel(row.issuedBy) === "—" ? "Unknown" : formatIssuedByLabel(row.issuedBy),
        email: row.issuedBy?.email && !row.issuedBy.email.endsWith("@ncdc.local")
          ? row.issuedBy.email
          : null,
        recipientCount: 0,
        itemCounts: Object.fromEntries(catalog.map((item) => [item.id, 0])),
        totalItems: 0,
      });
    }
    const acc = byIssuer.get(key);
    acc.recipientCount += 1;
    const items = row.items && typeof row.items === "object" ? row.items : {};
    for (const [itemId, qty] of Object.entries(items)) {
      const n = Number(qty) || 0;
      if (acc.itemCounts[itemId] !== undefined) acc.itemCounts[itemId] += n;
      acc.totalItems += n;
    }
  }

  const issuers = [...byIssuer.values()]
    .map((row) => ({
      issuerId: row.issuerId,
      name: row.name,
      email: row.email,
      recipientCount: row.recipientCount,
      totalItems: row.totalItems,
      items: catalog.map((item) => ({
        id: item.id,
        name: item.name,
        count: row.itemCounts[item.id] || 0,
      })),
    }))
    .sort((a, b) => b.totalItems - a.totalItems || a.name.localeCompare(b.name));

  const totals = {
    admins: issuers.length,
    recipientCount: issuers.reduce((sum, row) => sum + row.recipientCount, 0),
    totalItems: issuers.reduce((sum, row) => sum + row.totalItems, 0),
    items: catalog.map((item) => ({
      id: item.id,
      name: item.name,
      count: issuers.reduce((sum, row) => sum + (row.items.find((i) => i.id === item.id)?.count || 0), 0),
    })),
  };

  return {
    conference: { id: conference.id, title: conference.title, slug: conference.slug },
    catalog,
    issuers,
    totals,
  };
}

/**
 * @param {Awaited<ReturnType<typeof getGiftIssuersReport>>} data
 */
export function giftIssuersReportToCsv(data) {
  const lines = [];
  lines.push("Gifts issued by admin");
  lines.push([csvEscape("Conference"), csvEscape(data.conference?.title || "")].join(","));
  lines.push("");

  const catalog = data.catalog ?? [];
  const header = [
    "Admin",
    "Email",
    "Recipients issued",
    ...catalog.map((item) => item.name),
    "Total items",
  ];
  lines.push(header.map(csvEscape).join(","));

  for (const row of data.issuers ?? []) {
    lines.push(
      [
        row.name,
        row.email || "",
        row.recipientCount,
        ...catalog.map((item) => row.items.find((i) => i.id === item.id)?.count ?? 0),
        row.totalItems,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  lines.push("");
  lines.push(
    [
      "Total",
      "",
      data.totals?.recipientCount ?? 0,
      ...(data.totals?.items ?? []).map((item) => item.count),
      data.totals?.totalItems ?? 0,
    ]
      .map(csvEscape)
      .join(","),
  );

  return lines.join("\n");
}

/**
 * When issuing gifts to a registered attendee, optionally mark today's attendance.
 * @param {{
 *   conferenceId: string;
 *   userId: string | null;
 *   isConferenceRegistered: boolean;
 *   attendanceAction?: string | null;
 *   markedById?: string | null;
 * }} params
 */
export async function maybeMarkAttendanceForGiftIssue({
  conferenceId,
  userId,
  isConferenceRegistered,
  attendanceAction,
  markedById = null,
}) {
  if (attendanceAction !== "issue_and_mark" || !userId || !isConferenceRegistered) {
    return null;
  }

  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) return null;

  const registration = await prisma.conferenceRegistration.findUnique({
    where: { conferenceId_userId: { conferenceId, userId } },
  });
  if (!registration || registration.status !== "CONFIRMED") {
    return null;
  }

  const days = normalizeConferenceDays(conference.conferenceDays);
  const todayKey = getZonedDateTimeParts(new Date()).dateKey;
  const day = days.find((d) => d.date === todayKey);
  if (!day) return null;

  return prisma.conferenceAttendance.upsert({
    where: {
      conferenceId_userId_dayDate: {
        conferenceId,
        userId,
        dayDate: todayKey,
      },
    },
    update: {
      markedById: markedById || undefined,
    },
    create: {
      conferenceId,
      userId,
      dayDate: todayKey,
      dayIndex: day.dayIndex,
      markedById: markedById || null,
    },
  });
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
    const { adoptUserForConferencePerson } = await import(
      "@/lib/users/merge-conference-person"
    );
    const adopted = await adoptUserForConferencePerson({
      conferenceId,
      email: emailProvided ? normalizedEmail : null,
      firstName: first,
      lastName: last,
    });
    if (adopted.user) {
      userId = adopted.user.id;
    }
  }

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
