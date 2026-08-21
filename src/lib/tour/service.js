import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getProfileFromUser, buildProfilePayload } from "@/lib/users/profile";
import { formatIssuedByLabel } from "@/lib/users/actor";
import { isPlaceholderEmail } from "@/lib/users/merge-conference-person";
import { normalizeTourSettings } from "@/lib/tour/settings";
import { formatAmountPaid, parseAmountPaid } from "@/lib/tour/money";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * @param {import("@prisma/client").Prisma.Decimal | number | string | null | undefined} amount
 */
function amountToNumber(amount) {
  if (amount == null) return 0;
  const n = Number(amount);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {any} user
 * @param {string | null | undefined} organisationOverride
 */
function displayNameFromUser(user, organisationOverride) {
  const profile = getProfileFromUser(user);
  return {
    name: profile.fullName || user?.name || user?.email || "—",
    email: isPlaceholderEmail(user?.email) ? null : user?.email || null,
    organisation:
      organisationOverride ||
      profile.institution ||
      null,
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
  };
}

/**
 * @param {string} conferenceId
 */
export async function getConferenceTourAdminData(conferenceId) {
  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) throw new Error("Conference not found.");

  const settings = normalizeTourSettings(conference.tourSettings);
  if (!settings.allowed) {
    return {
      settings,
      rows: [],
      summary: { total: 0, amountTotal: 0, amountTotalFormatted: "0" },
      conference: { id: conference.id, title: conference.title, slug: conference.slug },
    };
  }

  const tourRows = await prisma.conferenceTourRegistration.findMany({
    where: { conferenceId },
    include: {
      user: {
        select: { id: true, email: true, name: true, profileData: true },
      },
      registeredBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { registeredAt: "desc" },
  });

  const tourUserIds = tourRows.map((r) => r.userId);
  const conferenceRegs =
    tourUserIds.length > 0
      ? await prisma.conferenceRegistration.findMany({
          where: {
            conferenceId,
            userId: { in: tourUserIds },
            status: { in: ["CONFIRMED", "PENDING"] },
          },
          select: { userId: true, status: true },
        })
      : [];
  const regByUser = new Map(conferenceRegs.map((r) => [r.userId, r.status]));

  let amountTotal = 0;
  const rows = tourRows.map((row) => {
    const amount = amountToNumber(row.amountPaid);
    amountTotal += amount;
    const display = displayNameFromUser(row.user, row.organisation);
    return {
      id: row.id,
      userId: row.userId,
      name: display.name,
      email: display.email,
      organisation: display.organisation,
      amountPaid: amount,
      amountPaidFormatted: formatAmountPaid(amount),
      notes: row.notes || null,
      registeredAt: row.registeredAt,
      registeredByLabel: formatIssuedByLabel(row.registeredBy),
      isConferenceRegistered: regByUser.has(row.userId),
      conferenceRegistrationStatus: regByUser.get(row.userId) || null,
    };
  });

  return {
    settings,
    rows,
    summary: {
      total: rows.length,
      amountTotal,
      amountTotalFormatted: formatAmountPaid(amountTotal),
    },
    conference: { id: conference.id, title: conference.title, slug: conference.slug },
  };
}

/**
 * Search people already known to this conference (registrations, gifts, tours)
 * plus platform users by email/name — for picking without creating duplicates.
 * @param {string} conferenceId
 * @param {string} query
 */
export async function searchTourRegistrationCandidates(conferenceId, query) {
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { id: true, tourSettings: true },
  });
  if (!conference) throw new Error("Conference not found.");
  if (!normalizeTourSettings(conference.tourSettings).allowed) {
    throw new Error("Conference tour registration is not enabled.");
  }

  const q = String(query || "").trim();
  if (q.length < 2) return { candidates: [] };

  const existingTour = await prisma.conferenceTourRegistration.findMany({
    where: { conferenceId },
    select: { userId: true },
  });
  const alreadyOnTour = new Set(existingTour.map((r) => r.userId));

  const [regs, giftIssuances, users] = await Promise.all([
    prisma.conferenceRegistration.findMany({
      where: {
        conferenceId,
        status: { in: ["CONFIRMED", "PENDING"] },
        OR: [
          { user: { email: { contains: q } } },
          { user: { name: { contains: q } } },
        ],
      },
      take: 20,
      include: {
        user: { select: { id: true, email: true, name: true, profileData: true } },
      },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.conferenceGiftIssuance.findMany({
      where: {
        conferenceId,
        userId: { not: null },
      },
      take: 80,
      include: {
        user: { select: { id: true, email: true, name: true, profileData: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q } },
          { name: { contains: q } },
        ],
        NOT: { email: { endsWith: "@ncdc.local" } },
      },
      take: 20,
      select: { id: true, email: true, name: true, profileData: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  /** @type {Map<string, any>} */
  const byId = new Map();

  function addCandidate(user, source) {
    if (!user?.id || alreadyOnTour.has(user.id)) return;
    const display = displayNameFromUser(user);
    const hay = `${display.name} ${display.email || ""} ${display.organisation || ""}`.toLowerCase();
    if (!hay.includes(q.toLowerCase()) && source === "gifts") return;
    const prev = byId.get(user.id);
    const sources = new Set(prev?.sources || []);
    sources.add(source);
    byId.set(user.id, {
      userId: user.id,
      name: display.name,
      email: display.email,
      organisation: display.organisation,
      sources: [...sources],
    });
  }

  for (const reg of regs) addCandidate(reg.user, "attendee");
  for (const gift of giftIssuances) addCandidate(gift.user, "gifts");
  for (const user of users) addCandidate(user, "user");

  const candidates = [...byId.values()]
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    .slice(0, 25);

  return { candidates };
}

/**
 * Register an existing user for the tour (no conference registration created).
 * @param {{
 *   conferenceId: string;
 *   userId: string;
 *   amountPaid: unknown;
 *   organisation?: string | null;
 *   notes?: string | null;
 *   registeredById?: string | null;
 * }} params
 */
export async function addExistingUserToTour(params) {
  const conference = await prisma.conference.findUnique({
    where: { id: params.conferenceId },
  });
  if (!conference) throw new Error("Conference not found.");
  if (!normalizeTourSettings(conference.tourSettings).allowed) {
    throw new Error("Conference tour registration is not enabled.");
  }

  const amount = parseAmountPaid(params.amountPaid);
  if (!amount.ok) throw httpError(amount.error, 400);

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, name: true, profileData: true },
  });
  if (!user) throw httpError("User not found.", 404);

  const existing = await prisma.conferenceTourRegistration.findUnique({
    where: {
      conferenceId_userId: {
        conferenceId: params.conferenceId,
        userId: user.id,
      },
    },
  });
  if (existing) {
    throw httpError("This person is already registered for the conference tour.", 409);
  }

  const org = String(params.organisation || "").trim() || null;
  const notes = String(params.notes || "").trim() || null;
  const profile = getProfileFromUser(user);
  const organisation = org || profile.institution || null;

  const row = await prisma.conferenceTourRegistration.create({
    data: {
      conferenceId: params.conferenceId,
      userId: user.id,
      amountPaid: amount.value,
      organisation,
      notes,
      registeredById: params.registeredById || null,
    },
  });

  const display = displayNameFromUser(user, organisation);

  return {
    ok: true,
    registration: row,
    person: {
      userId: user.id,
      name: display.name,
      email: display.email,
      organisation: display.organisation,
      amountPaid: amount.value,
      amountPaidFormatted: formatAmountPaid(amount.value),
    },
    message: "Person added to conference tour registration.",
  };
}

/**
 * Add a new person (or adopt existing) to tour only — does not create conference registration.
 * @param {{
 *   conferenceId: string;
 *   firstName: string;
 *   lastName: string;
 *   organisation?: string | null;
 *   email?: string | null;
 *   amountPaid: unknown;
 *   notes?: string | null;
 *   acknowledged?: boolean;
 *   registeredById?: string | null;
 * }} params
 */
export async function addTourRegistrant(params) {
  const first = String(params.firstName || "").trim().replace(/\s+/g, " ");
  const last = String(params.lastName || "").trim().replace(/\s+/g, " ");
  if (!first || !last) throw httpError("First name and last name are required.", 400);

  const conference = await prisma.conference.findUnique({
    where: { id: params.conferenceId },
  });
  if (!conference) throw new Error("Conference not found.");
  if (!normalizeTourSettings(conference.tourSettings).allowed) {
    throw new Error("Conference tour registration is not enabled.");
  }

  const amount = parseAmountPaid(params.amountPaid);
  if (!amount.ok) throw httpError(amount.error, 400);

  let normalizedEmail = params.email ? String(params.email).trim().toLowerCase() : "";
  const emailProvided = Boolean(normalizedEmail);
  if (emailProvided && !EMAIL_RE.test(normalizedEmail)) {
    throw httpError("Enter a valid email address.", 400);
  }

  const organisation = String(params.organisation || "").trim() || null;
  const notes = String(params.notes || "").trim() || null;
  const acknowledged = Boolean(params.acknowledged);

  const { findAttendeeDuplicates } = await import("@/lib/registration/admin-attendee");
  const duplicates = await findAttendeeDuplicates({
    conferenceId: params.conferenceId,
    firstName: first,
    lastName: last,
    email: normalizedEmail || null,
  });
  const registered = duplicates[0] || null;

  const existingTourByUser = registered?.userId
    ? await prisma.conferenceTourRegistration.findUnique({
        where: {
          conferenceId_userId: {
            conferenceId: params.conferenceId,
            userId: registered.userId,
          },
        },
      })
    : null;

  if (existingTourByUser) {
    throw httpError("This person is already registered for the conference tour.", 409);
  }

  if (!acknowledged) {
    if (registered) {
      return {
        needsConfirmation: true,
        confirmationType: "registered",
        duplicates,
        message:
          "This person is already registered for this conference. Continue to add them to the tour list only? They will not be registered again.",
      };
    }
    return {
      needsConfirmation: true,
      confirmationType: "tour_only",
      duplicates: [],
      message:
        "This person is not on the conference registration list. They will only be added to tour registration (not as a conference attendee). You can register them separately later.",
    };
  }

  let userId = registered?.userId || null;

  if (!userId) {
    const { adoptUserForConferencePerson } = await import(
      "@/lib/users/merge-conference-person"
    );
    const adopted = await adoptUserForConferencePerson({
      conferenceId: params.conferenceId,
      email: emailProvided ? normalizedEmail : null,
      firstName: first,
      lastName: last,
      institution: organisation,
    });
    if (adopted.user) {
      userId = adopted.user.id;
    }
  }

  if (!userId) {
    if (!emailProvided) {
      normalizedEmail = `noemail.${Date.now().toString(36)}.${randomBytes(3).toString("hex")}@ncdc.local`;
    }

    const profile = buildProfilePayload({
      firstName: first,
      lastName: last,
      institution: organisation || "",
    });
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

  const already = await prisma.conferenceTourRegistration.findUnique({
    where: {
      conferenceId_userId: {
        conferenceId: params.conferenceId,
        userId,
      },
    },
  });
  if (already) {
    throw httpError("This person is already registered for the conference tour.", 409);
  }

  const row = await prisma.conferenceTourRegistration.create({
    data: {
      conferenceId: params.conferenceId,
      userId,
      amountPaid: amount.value,
      organisation,
      notes,
      registeredById: params.registeredById || null,
    },
  });

  return {
    needsConfirmation: false,
    confirmationType: registered ? "registered" : "tour_only",
    registered: Boolean(registered),
    registration: row,
    person: {
      userId,
      name: `${first} ${last}`.trim(),
      email: emailProvided ? normalizedEmail : null,
      organisation,
      amountPaid: amount.value,
      amountPaidFormatted: formatAmountPaid(amount.value),
    },
    message: registered
      ? "Person added to tour registration (linked to their existing conference registration)."
      : "Person added to tour registration only (not registered for the conference).",
  };
}

/**
 * Update amount / notes / organisation for a tour row.
 * @param {{
 *   conferenceId: string;
 *   registrationId: string;
 *   amountPaid?: unknown;
 *   organisation?: string | null;
 *   notes?: string | null;
 * }} params
 */
export async function updateTourRegistration(params) {
  const row = await prisma.conferenceTourRegistration.findFirst({
    where: { id: params.registrationId, conferenceId: params.conferenceId },
  });
  if (!row) throw httpError("Tour registration not found.", 404);

  /** @type {Record<string, unknown>} */
  const data = {};
  if (params.amountPaid !== undefined) {
    const amount = parseAmountPaid(params.amountPaid);
    if (!amount.ok) throw httpError(amount.error, 400);
    data.amountPaid = amount.value;
  }
  if (params.organisation !== undefined) {
    data.organisation = String(params.organisation || "").trim() || null;
  }
  if (params.notes !== undefined) {
    data.notes = String(params.notes || "").trim() || null;
  }

  const updated = await prisma.conferenceTourRegistration.update({
    where: { id: row.id },
    data,
  });
  return { ok: true, registration: updated };
}

/**
 * @param {string} conferenceId
 * @param {string} registrationId
 */
export async function removeTourRegistration(conferenceId, registrationId) {
  const row = await prisma.conferenceTourRegistration.findFirst({
    where: { id: registrationId, conferenceId },
    include: {
      user: {
        select: { id: true, email: true, name: true, profileData: true },
      },
    },
  });
  if (!row) throw httpError("Tour registration not found.", 404);

  const display = displayNameFromUser(row.user, row.organisation);
  await prisma.conferenceTourRegistration.delete({ where: { id: row.id } });

  return {
    ok: true,
    removed: {
      id: row.id,
      userId: row.userId,
      name: display.name,
      email: display.email,
      organisation: display.organisation,
      amountPaid: amountToNumber(row.amountPaid),
      amountPaidFormatted: formatAmountPaid(amountToNumber(row.amountPaid)),
    },
  };
}

/**
 * Build CSV for Excel download of conference tour registrations.
 * @param {Awaited<ReturnType<typeof getConferenceTourAdminData>>} data
 */
export function tourRegistrationsToCsv(data) {
  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [];
  lines.push("Conference tour registrations");
  lines.push(["Conference", data.conference?.title || ""].map(esc).join(","));
  lines.push(["Total registered", data.summary?.total ?? 0].map(esc).join(","));
  lines.push(
    ["Total amount paid", data.summary?.amountTotalFormatted ?? "0"].map(esc).join(","),
  );
  lines.push("");
  lines.push(
    [
      "Name",
      "Email",
      "Organisation",
      "Amount paid",
      "Notes",
      "Registered at",
      "Registered by",
      "Conference attendee",
    ]
      .map(esc)
      .join(","),
  );

  for (const row of data.rows || []) {
    lines.push(
      [
        row.name || "",
        row.email || "",
        row.organisation || "",
        row.amountPaidFormatted || "",
        row.notes || "",
        row.registeredAt ? new Date(row.registeredAt).toISOString() : "",
        row.registeredByLabel || "",
        row.isConferenceRegistered ? "Yes" : "No",
      ]
        .map(esc)
        .join(","),
    );
  }

  return `\uFEFF${lines.join("\n")}`;
}
