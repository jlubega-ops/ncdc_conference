const STALE_MS = 5 * 60 * 1000;

/** @type {Map<string, number>} */
const pending = new Map();

function jobKey(userId, slug) {
  return `${userId}:${slug}`;
}

/**
 * @param {string} userId
 * @param {string} slug
 */
export function isCertificateEmailPending(userId, slug) {
  const key = jobKey(userId, slug);
  const started = pending.get(key);
  if (!started) return false;
  if (Date.now() - started > STALE_MS) {
    pending.delete(key);
    return false;
  }
  return true;
}

/**
 * @param {string} userId
 * @param {string} slug
 * @returns {boolean} true if this caller now owns the job
 */
export function beginCertificateEmailJob(userId, slug) {
  if (isCertificateEmailPending(userId, slug)) return false;
  pending.set(jobKey(userId, slug), Date.now());
  return true;
}

/**
 * @param {string} userId
 * @param {string} slug
 */
export function endCertificateEmailJob(userId, slug) {
  pending.delete(jobKey(userId, slug));
}
