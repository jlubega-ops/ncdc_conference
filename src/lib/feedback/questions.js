import { createId } from "@/lib/feedback/ids";

/** Feedback types stored on ConferenceFeedback.feedbackType */
export const FEEDBACK_TYPES = {
  DAY: "DAY",
  SPEAKER: "SPEAKER",
};

/** Likert 5 → 1 scale used for day and speaker questions */
export const LIKERT_OPTIONS = [
  { value: 5, label: "Strongly agree" },
  { value: 4, label: "Agree" },
  { value: 3, label: "Not sure" },
  { value: 2, label: "Disagree" },
  { value: 1, label: "Strongly disagree" },
];

export const LIKERT_LABELS = Object.fromEntries(
  LIKERT_OPTIONS.map((o) => [o.value, o.label]),
);

/** Speaker roles that can be toggled for evaluation */
export const EVALUATE_SPEAKER_TYPES = [
  { value: "normal", label: "Speakers" },
  { value: "keynote", label: "Keynote speakers" },
  { value: "guest", label: "Guest speakers" },
  { value: "host", label: "Hosts" },
  { value: "mc", label: "MCs" },
];

export const DEFAULT_DAY_QUESTIONS = [
  {
    id: "overall",
    label: "Overall, today met my expectations",
    type: "likert",
  },
  {
    id: "organisation",
    label: "The organisation (venue, timing, logistics) was good",
    type: "likert",
  },
];

export const DEFAULT_SPEAKER_QUESTIONS = [
  {
    id: "clarity",
    label: "The presentation was clear and easy to follow",
    type: "likert",
  },
  {
    id: "useful",
    label: "This session was useful to me",
    type: "likert",
  },
];

export const DEFAULT_FEEDBACK_SETTINGS = {
  allowed: true,
  /** @type {"daily" | "always"} */
  availability: "daily",
  questions: DEFAULT_DAY_QUESTIONS,
  speakerQuestions: DEFAULT_SPEAKER_QUESTIONS,
  evaluateSpeakers: true,
  evaluateTypes: {
    normal: true,
    keynote: true,
    guest: true,
    host: true,
    mc: true,
  },
};

/**
 * @param {unknown} raw
 */
export function normalizeFeedbackSettings(raw) {
  const base = { ...DEFAULT_FEEDBACK_SETTINGS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ...base,
      questions: [...DEFAULT_DAY_QUESTIONS],
      speakerQuestions: [...DEFAULT_SPEAKER_QUESTIONS],
      evaluateTypes: { ...DEFAULT_FEEDBACK_SETTINGS.evaluateTypes },
    };
  }

  const questions = Array.isArray(raw.questions)
    ? raw.questions
        .map((q) => normalizeQuestion(q))
        .filter(Boolean)
    : [...DEFAULT_DAY_QUESTIONS];

  const speakerQuestions = Array.isArray(raw.speakerQuestions)
    ? raw.speakerQuestions
        .map((q) => normalizeQuestion(q))
        .filter(Boolean)
    : [...DEFAULT_SPEAKER_QUESTIONS];

  const evaluateTypes = {
    ...DEFAULT_FEEDBACK_SETTINGS.evaluateTypes,
    ...(raw.evaluateTypes && typeof raw.evaluateTypes === "object"
      ? raw.evaluateTypes
      : {}),
  };

  return {
    allowed: raw.allowed !== false,
    availability: raw.availability === "always" ? "always" : "daily",
    questions: questions.length ? questions : [...DEFAULT_DAY_QUESTIONS],
    speakerQuestions: speakerQuestions.length
      ? speakerQuestions
      : [...DEFAULT_SPEAKER_QUESTIONS],
    evaluateSpeakers: raw.evaluateSpeakers !== false,
    evaluateTypes,
  };
}

/**
 * @param {unknown} q
 */
function normalizeQuestion(q) {
  if (!q || typeof q !== "object") return null;
  const label = String(q.label ?? "").trim();
  if (!label) return null;
  const id = String(q.id ?? "").trim() || createId("q");
  return { id, label, type: "likert" };
}

/**
 * @param {string} feedbackType
 * @param {ReturnType<typeof normalizeFeedbackSettings>} [settings]
 */
export function getFeedbackQuestions(feedbackType, settings) {
  const normalized = normalizeFeedbackSettings(settings);
  if (feedbackType === FEEDBACK_TYPES.SPEAKER) {
    return {
      type: FEEDBACK_TYPES.SPEAKER,
      ratings: normalized.speakerQuestions.map((q) => ({
        key: q.id,
        label: q.label,
      })),
      yesNo: [],
      commentLabel: "Any comment for this speaker? (optional)",
      commentMaxLength: 300,
    };
  }
  return {
    type: FEEDBACK_TYPES.DAY,
    ratings: normalized.questions.map((q) => ({
      key: q.id,
      label: q.label,
    })),
    yesNo: [],
    commentLabel: "Anything else you'd like to share? (optional)",
    commentMaxLength: 300,
  };
}

/**
 * @param {unknown} value
 */
function clampRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

/**
 * Validate + normalize a feedback submission body against the question set.
 * @param {string} feedbackType
 * @param {{ answers?: Record<string, unknown>; comment?: string }} body
 * @param {ReturnType<typeof normalizeFeedbackSettings>} [settings]
 */
export function validateFeedbackAnswers(feedbackType, body, settings) {
  const questions = getFeedbackQuestions(feedbackType, settings);
  const rawAnswers = body?.answers && typeof body.answers === "object" ? body.answers : {};
  const answers = {};

  for (const q of questions.ratings) {
    const value = clampRating(rawAnswers[q.key]);
    if (!value) {
      return { error: `Please rate: ${q.label}` };
    }
    answers[q.key] = value;
  }

  for (const q of questions.yesNo) {
    const raw = rawAnswers[q.key];
    if (raw !== true && raw !== false) {
      return { error: `Please answer: ${q.label}` };
    }
    answers[q.key] = raw;
  }

  const rawComment = body?.comment ?? rawAnswers.comment ?? "";
  const comment = String(rawComment).trim().slice(0, questions.commentMaxLength ?? 300);

  const primaryRatingKey = questions.ratings[0]?.key;
  const rating = primaryRatingKey ? answers[primaryRatingKey] ?? null : null;

  return { answers, rating, comment: comment || null };
}

/**
 * @param {string} dayDate
 * @param {string} speakerId
 */
export function speakerFeedbackTargetKey(dayDate, speakerId) {
  return `${dayDate}:${speakerId}`;
}

/**
 * @param {string} targetKey
 */
export function parseSpeakerFeedbackTargetKey(targetKey) {
  const idx = String(targetKey).indexOf(":");
  if (idx <= 0) return { dayDate: null, speakerId: targetKey };
  return {
    dayDate: targetKey.slice(0, idx),
    speakerId: targetKey.slice(idx + 1),
  };
}

/**
 * Filter speakers for feedback based on conference settings.
 * Defaults to showing all day speakers unless evaluateSpeakers is explicitly off.
 * @param {any[]} speakers
 * @param {ReturnType<typeof normalizeFeedbackSettings>} settings
 */
export function filterSpeakersForFeedback(speakers, settings) {
  const list = (Array.isArray(speakers) ? speakers : []).filter(Boolean);
  if (!list.length) return [];
  if (settings?.evaluateSpeakers === false) return [];

  const types = settings?.evaluateTypes;
  if (!types || typeof types !== "object") return list;

  const enabledTypes = Object.entries(types)
    .filter(([, enabled]) => enabled !== false)
    .map(([key]) => key);

  // Misconfigured "all off" should not hide speakers when evaluation is enabled.
  if (enabledTypes.length === 0) return list;

  return list.filter((s) => enabledTypes.includes(s?.speakerType || "normal"));
}
