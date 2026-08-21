/**
 * Parse amount paid from admin input (allows commas / spaces).
 * @param {unknown} raw
 * @returns {{ ok: true; value: number } | { ok: false; error: string }}
 */
export function parseAmountPaid(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: false, error: "Amount paid is required." };
  }
  const cleaned = String(raw)
    .trim()
    .replace(/,/g, "")
    .replace(/\s+/g, "");
  if (!cleaned) {
    return { ok: false, error: "Amount paid is required." };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return {
      ok: false,
      error: "Enter a valid amount (digits only; optional decimals, commas allowed).",
    };
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, error: "Amount paid must be zero or greater." };
  }
  // Cap absurd values
  if (value > 999_999_999_999.99) {
    return { ok: false, error: "Amount paid is too large." };
  }
  return { ok: true, value: Math.round(value * 100) / 100 };
}

/**
 * Format amount for display with thousand separators.
 * @param {unknown} value
 * @param {{ maximumFractionDigits?: number }} [opts]
 */
export function formatAmountPaid(value, opts = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const maxFrac = opts.maximumFractionDigits ?? 2;
  const hasFrac = Math.abs(n % 1) > 0;
  return n.toLocaleString("en-UG", {
    minimumFractionDigits: hasFrac ? Math.min(2, maxFrac) : 0,
    maximumFractionDigits: maxFrac,
  });
}

/**
 * Live input helper: strip illegal chars, keep digits/one decimal, insert commas.
 * @param {string} raw
 */
export function formatAmountPaidInput(raw) {
  let s = String(raw || "").replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s =
      s.slice(0, firstDot + 1) +
      s
        .slice(firstDot + 1)
        .replace(/\./g, "")
        .slice(0, 2);
  }
  const [intPart, fracPart] = s.split(".");
  const withCommas = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fracPart !== undefined) {
    return `${withCommas}.${fracPart}`;
  }
  return withCommas;
}
