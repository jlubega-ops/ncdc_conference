/** One Gmail send per attendee per conference per day. Downloads are unlimited. */
export const CERTIFICATE_EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * @param {Date | string | null | undefined} emailedAt
 * @param {Date} [now]
 */
export function getCertificateEmailCooldown(emailedAt, now = new Date()) {
  if (!emailedAt) {
    return { blocked: false, retryAt: null, message: null };
  }

  const sentMs = new Date(emailedAt).getTime();
  if (Number.isNaN(sentMs)) {
    return { blocked: false, retryAt: null, message: null };
  }

  const retryAt = new Date(sentMs + CERTIFICATE_EMAIL_COOLDOWN_MS);
  if (now.getTime() >= retryAt.getTime()) {
    return { blocked: false, retryAt: null, message: null };
  }

  const when = retryAt.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return {
    blocked: true,
    retryAt,
    message: `This certificate was already emailed. You can request another email after ${when}. Use Download PDF instead — it does not send mail.`,
  };
}
