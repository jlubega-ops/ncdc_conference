/**
 * Client-side pagination for already-loaded, already-filtered rows.
 * Search/filter stay instant because they run in memory; this only slices the view.
 *
 * @template T
 * @param {T[]} rows
 * @param {number} page 1-based
 * @param {number} [pageSize]
 */
export function paginateRows(rows, page, pageSize = 25) {
  const list = Array.isArray(rows) ? rows : [];
  const size = Math.max(1, Number(pageSize) || 25);
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * size;
  return {
    page: safePage,
    pageSize: size,
    total,
    totalPages,
    start: total === 0 ? 0 : start + 1,
    end: Math.min(total, start + size),
    rows: list.slice(start, start + size),
  };
}
