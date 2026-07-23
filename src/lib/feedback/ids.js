/**
 * Lightweight id for feedback question drafts (client + server safe).
 * @param {string} [prefix]
 */
export function createId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
