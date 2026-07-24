import { createId } from "@/lib/feedback/ids";
import { SPEAKER_TYPES } from "@/lib/conferences/constants";

export const GIFT_CATEGORY_PARTICIPANTS = "participants";

export const GIFT_CATEGORIES = [
  { value: GIFT_CATEGORY_PARTICIPANTS, label: "Participants / attendees" },
  ...SPEAKER_TYPES.map((t) => ({ value: t.value, label: t.label })),
];

export const DEFAULT_GIFTS_SETTINGS = {
  applicable: false,
  items: [],
  categories: {
    participants: true,
    normal: false,
    keynote: false,
    guest: false,
    host: false,
    mc: false,
  },
};

/**
 * @param {unknown} raw
 */
export function normalizeGiftsSettings(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ...DEFAULT_GIFTS_SETTINGS,
      items: [],
      categories: { ...DEFAULT_GIFTS_SETTINGS.categories },
    };
  }

  const items = Array.isArray(raw.items)
    ? raw.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const name = String(item.name ?? "").trim();
          if (!name) return null;
          const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
          const stockRaw = Number(item.stock);
          const stock = Number.isFinite(stockRaw)
            ? Math.max(0, Math.round(stockRaw))
            : 0;
          return {
            id: String(item.id ?? "").trim() || createId("gift"),
            name,
            quantity,
            stock,
          };
        })
        .filter(Boolean)
    : [];

  const categories = {
    ...DEFAULT_GIFTS_SETTINGS.categories,
    ...(raw.categories && typeof raw.categories === "object" ? raw.categories : {}),
  };

  return {
    applicable: Boolean(raw.applicable),
    items,
    categories,
  };
}

/**
 * @param {ReturnType<typeof normalizeGiftsSettings>} settings
 */
export function getEnabledGiftCategories(settings) {
  const normalized = normalizeGiftsSettings(settings);
  if (!normalized.applicable) return [];
  return GIFT_CATEGORIES.filter((c) => normalized.categories?.[c.value] === true);
}

/**
 * Count speakers by gift category type.
 * @param {unknown[]} speakers
 */
export function countSpeakersByGiftCategory(speakers) {
  /** @type {Record<string, number>} */
  const counts = {
    participants: 0,
    normal: 0,
    keynote: 0,
    guest: 0,
    host: 0,
    mc: 0,
  };
  for (const raw of Array.isArray(speakers) ? speakers : []) {
    if (!raw || typeof raw !== "object") continue;
    const type = ["normal", "keynote", "guest", "host", "mc"].includes(raw.speakerType)
      ? raw.speakerType
      : "normal";
    counts[type] += 1;
  }
  return counts;
}

/**
 * Disable / clear gift categories that have no speakers yet.
 * Participants stay available (attendees register later).
 * @param {ReturnType<typeof normalizeGiftsSettings>} settings
 * @param {unknown[]} speakers
 */
export function applyGiftCategoryAvailability(settings, speakers) {
  const normalized = normalizeGiftsSettings(settings);
  const counts = countSpeakersByGiftCategory(speakers);
  const categories = { ...normalized.categories };
  for (const cat of GIFT_CATEGORIES) {
    if (cat.value === GIFT_CATEGORY_PARTICIPANTS) continue;
    if ((counts[cat.value] ?? 0) < 1) {
      categories[cat.value] = false;
    }
  }
  return { ...normalized, categories };
}

/**
 * Whether a gift category checkbox can be enabled for the current speaker list.
 * @param {string} category
 * @param {unknown[]} speakers
 */
export function canEnableGiftCategory(category, speakers) {
  if (category === GIFT_CATEGORY_PARTICIPANTS) return true;
  const counts = countSpeakersByGiftCategory(speakers);
  return (counts[category] ?? 0) > 0;
}

/**
 * @param {string} userId
 */
export function userGiftRecipientKey(userId) {
  return `user:${userId}`;
}

/**
 * @param {string} speakerId
 */
export function speakerGiftRecipientKey(speakerId) {
  return `speaker:${speakerId}`;
}

/**
 * @param {string} recipientKey
 */
export function parseGiftRecipientKey(recipientKey) {
  const raw = String(recipientKey || "");
  if (raw.startsWith("user:")) {
    return { type: "user", id: raw.slice(5) };
  }
  if (raw.startsWith("speaker:")) {
    return { type: "speaker", id: raw.slice(8) };
  }
  return { type: null, id: null };
}

/**
 * @param {Record<string, number> | null | undefined} issuedItems
 * @param {{ id: string; quantity: number }[]} catalog
 */
export function countIssuedGiftProgress(issuedItems, catalog) {
  const items = Array.isArray(catalog) ? catalog : [];
  const issued = issuedItems && typeof issuedItems === "object" ? issuedItems : {};
  let got = 0;
  for (const item of items) {
    const qty = Number(issued[item.id] ?? 0);
    if (qty > 0) got += 1;
  }
  return { got, total: items.length };
}

/**
 * @param {Record<string, number> | null | undefined} issuedItems
 * @param {{ id: string; name: string; quantity: number }[]} catalog
 */
export function describeIssuedGiftItems(issuedItems, catalog) {
  const items = Array.isArray(catalog) ? catalog : [];
  const issued = issuedItems && typeof issuedItems === "object" ? issuedItems : {};
  return items
    .map((item) => {
      const qty = Number(issued[item.id] ?? 0);
      if (qty <= 0) return null;
      return { id: item.id, name: item.name, quantity: qty };
    })
    .filter(Boolean);
}

/**
 * Sum issued quantities per catalog item across roster rows.
 * @param {{ issuedItems?: Record<string, number> | null }[]} roster
 * @param {{ id: string; name: string }[]} catalog
 */
export function sumIssuedItemCounts(roster, catalog) {
  const items = Array.isArray(catalog) ? catalog : [];
  /** @type {Record<string, number>} */
  const issuedTotals = {};
  for (const item of items) {
    issuedTotals[item.id] = 0;
  }
  for (const row of roster || []) {
    const issued = row?.issuedItems && typeof row.issuedItems === "object" ? row.issuedItems : {};
    for (const [itemId, qty] of Object.entries(issued)) {
      if (!(itemId in issuedTotals)) continue;
      issuedTotals[itemId] += Math.max(0, Number(qty) || 0);
    }
  }
  return items.map((item) => {
    const count = issuedTotals[item.id] || 0;
    const stock = Math.max(0, Number(item.stock) || 0);
    return {
      id: item.id,
      name: item.name,
      count,
      stock,
      remaining: Math.max(0, stock - count),
    };
  });
}
