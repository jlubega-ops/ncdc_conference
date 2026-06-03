/** NCDC-aligned chart palette */
export const CHART_COLORS = [
  "#008e51",
  "#006941",
  "#3b82f6",
  "#b45309",
  "#7c3aed",
  "#0d9488",
  "#cf2e2e",
  "#627792",
  "#15803d",
  "#d97706",
];

/**
 * @param {Array<{ value: number; color: string }>} segments
 */
export function buildConicGradient(segments) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return "conic-gradient(#e9ecef 0deg 360deg)";

  let acc = 0;
  const stops = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const deg = (seg.value / total) * 360;
      const start = acc;
      acc += deg;
      return `${seg.color} ${start}deg ${acc}deg`;
    });

  return `conic-gradient(${stops.join(", ")})`;
}

/**
 * @param {Record<string, number>} counts
 * @param {Record<string, string>} [labels]
 */
export function countsToSegments(counts, labels = {}) {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  return entries.map(([key, value], i) => ({
    key,
    label: labels[key] ?? key,
    value,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
}

/**
 * @param {Array<{ label: string; value: number }>} items
 */
export function topN(items, n = 8) {
  return [...items].sort((a, b) => b.value - a.value).slice(0, n);
}
