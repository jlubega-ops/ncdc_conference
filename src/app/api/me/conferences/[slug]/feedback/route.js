import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { jsonNoStore } from "@/lib/http/no-store";
import {
  getPublishedConferenceBySlugCached,
} from "@/lib/conferences/public-cache";
import { mapConferenceForUi } from "@/lib/conferences/service";
import { requireConfirmedRegistration } from "@/lib/auth/conference-member";
import {
  getZonedDateTimeParts,
  normalizeConferenceDays,
} from "@/lib/attendance/utils";
import { getSpeakersForDate } from "@/lib/conferences/utils";
import {
  FEEDBACK_TYPES,
  filterSpeakersForFeedback,
  normalizeFeedbackSettings,
  parseSpeakerFeedbackTargetKey,
  validateFeedbackAnswers,
} from "@/lib/feedback/questions";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

/**
 * Published conferences, or any conference the attendee can open by slug.
 * @param {string} slug
 */
async function resolveConferenceForFeedback(slug) {
  const published = await getPublishedConferenceBySlugCached(slug);
  if (published) return published;
  const row = await prisma.conference.findFirst({ where: { slug } });
  return row ? mapConferenceForUi(row) : null;
}

/**
 * @param {any} conference
 * @param {string} todayKey
 */
function buildFeedbackDays(conference, todayKey) {
  const settings = normalizeFeedbackSettings(conference.feedbackSettings);
  const days = normalizeConferenceDays(conference.conferenceDays);
  const allSpeakers = Array.isArray(conference.speakers) ? conference.speakers : [];
  const alwaysOpen = settings.availability === "always";

  return days.map((day) => {
    const status =
      day.date === todayKey ? "today" : day.date < todayKey ? "past" : "future";
    const daySpeakers = filterSpeakersForFeedback(
      getSpeakersForDate(allSpeakers, day.date),
      settings,
    );
    return {
      ...day,
      status,
      canSubmit: alwaysOpen ? status !== "future" : status === "today",
      speakers: daySpeakers.map((speaker) => ({
        id: speaker.id,
        name: speaker.name,
        title: speaker.title,
        photo: speaker.photo,
        speakerType: speaker.speakerType,
      })),
    };
  });
}

/**
 * @param {string} feedbackType
 * @param {string} targetKey
 */
function resolveFeedbackDayDate(feedbackType, targetKey) {
  if (feedbackType === FEEDBACK_TYPES.DAY) return targetKey;
  const parsed = parseSpeakerFeedbackTargetKey(targetKey);
  return parsed.dayDate || null;
}

function mapFeedbackRow(row) {
  return {
    feedbackType: row.feedbackType,
    targetKey: row.targetKey,
    answers: row.answers,
    rating: row.rating,
    comment: row.comment,
    isAnonymous: Boolean(row.isAnonymous),
    updatedAt: row.updatedAt,
  };
}

export async function GET(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const conference = await resolveConferenceForFeedback(slug);
  if (!conference) {
    return jsonNoStore({ error: "Conference not found." }, { status: 404 });
  }

  const check = await requireConfirmedRegistration(session.user.id, conference.id);
  if (!check.ok) {
    return jsonNoStore({ error: check.error }, { status: check.status });
  }

  const settings = normalizeFeedbackSettings(conference.feedbackSettings);
  if (!settings.allowed) {
    return jsonNoStore(
      { error: "Feedback is not enabled for this conference." },
      { status: 403 },
    );
  }

  const tz = conference.timezone || "Africa/Nairobi";
  const { dateKey: todayKey } = getZonedDateTimeParts(new Date(), tz);

  const rows = await prisma.conferenceFeedback.findMany({
    where: { conferenceId: conference.id, userId: session.user.id },
  });

  const isAnonymous = rows.some((r) => r.isAnonymous);
  const days = buildFeedbackDays(conference, todayKey);
  const currentMeetingDay = days.find((d) => d.date === todayKey) ?? null;

  return jsonNoStore({
    conference: { slug: conference.slug, title: conference.title },
    settings,
    timezone: tz,
    todayKey,
    currentMeetingDay,
    days,
    feedback: rows.map(mapFeedbackRow),
    isAnonymous,
  });
}

export async function POST(request, { params }) {
  const session = await requireSession();
  if (!session) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const conference = await resolveConferenceForFeedback(slug);
  if (!conference) {
    return jsonNoStore({ error: "Conference not found." }, { status: 404 });
  }

  const check = await requireConfirmedRegistration(session.user.id, conference.id);
  if (!check.ok) {
    return jsonNoStore({ error: check.error }, { status: check.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid request body." }, { status: 400 });
  }

  const settings = normalizeFeedbackSettings(conference.feedbackSettings);
  if (!settings.allowed) {
    return jsonNoStore(
      { error: "Feedback is not enabled for this conference." },
      { status: 403 },
    );
  }
  const feedbackType =
    body?.feedbackType === FEEDBACK_TYPES.SPEAKER
      ? FEEDBACK_TYPES.SPEAKER
      : FEEDBACK_TYPES.DAY;
  const targetKey = String(body?.targetKey || "").trim();
  if (!targetKey) {
    return jsonNoStore(
      { error: "A target day or speaker is required." },
      { status: 400 },
    );
  }

  const tz = conference.timezone || "Africa/Nairobi";
  const { dateKey: todayKey } = getZonedDateTimeParts(new Date(), tz);
  const dayDate = resolveFeedbackDayDate(feedbackType, targetKey);
  const scheduledDays = normalizeConferenceDays(conference.conferenceDays);
  const isScheduledDay = scheduledDays.some((d) => d.date === dayDate);

  if (!dayDate || !isScheduledDay) {
    return jsonNoStore({ error: "Invalid feedback day." }, { status: 400 });
  }
  if (settings.availability === "always") {
    if (dayDate > todayKey) {
      return jsonNoStore(
        { error: "Feedback for future days opens on the meeting date." },
        { status: 403 },
      );
    }
  } else {
    if (dayDate < todayKey) {
      return jsonNoStore(
        { error: "Feedback for past days is locked and cannot be edited." },
        { status: 403 },
      );
    }
    if (dayDate > todayKey) {
      return jsonNoStore(
        { error: "Feedback for future days opens on the meeting date." },
        { status: 403 },
      );
    }
  }

  const { answers, rating, comment, error } = validateFeedbackAnswers(
    feedbackType,
    body,
    settings,
  );
  if (error) {
    return jsonNoStore({ error }, { status: 400 });
  }

  const isAnonymous = Boolean(body?.isAnonymous);

  const row = await prisma.conferenceFeedback.upsert({
    where: {
      conferenceId_userId_feedbackType_targetKey: {
        conferenceId: conference.id,
        userId: session.user.id,
        feedbackType,
        targetKey,
      },
    },
    update: { answers, rating, comment, isAnonymous },
    create: {
      conferenceId: conference.id,
      userId: session.user.id,
      feedbackType,
      targetKey,
      answers,
      rating,
      comment,
      isAnonymous,
    },
  });

  await prisma.conferenceFeedback.updateMany({
    where: { conferenceId: conference.id, userId: session.user.id },
    data: { isAnonymous },
  });

  await logActivity({
    session,
    request,
    action: ACTIVITY_ACTIONS.FEEDBACK_SUBMIT,
    description: `Submitted ${feedbackType.toLowerCase()} feedback for ${dayDate}`,
    resourceType: "feedback",
    resourceId: row.id,
    conferenceId: conference.id,
    metadata: { feedbackType, targetKey, isAnonymous },
  });

  return jsonNoStore({ ok: true, feedback: mapFeedbackRow(row) });
}
