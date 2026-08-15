import { toast } from "react-toastify";

const POLL_MS = 3000;
const WAIT_MS = 3 * 60 * 1000;

/**
 * @param {Response} res
 * @param {string} fallback
 */
async function readErrorMessage(res, fallback) {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (data?.error) return String(data.error);
    if (data?.message) return String(data.message);
  } catch {
    /* nginx timeouts often return HTML */
  }
  if (res.status === 401) return "Please sign in again, then try sending the email.";
  if (res.status === 409) return "Your certificate email is already being sent. Please wait a moment.";
  if (res.status === 429) {
    return "This certificate was already emailed recently. Use Download PDF, or try email again after 24 hours.";
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return "The server took too long. Please try again, or download the PDF instead.";
  }
  return fallback;
}

/**
 * @param {string} slug
 * @param {number} startedAt
 */
async function waitForRecentEmail(slug, startedAt) {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    try {
      const res = await fetch("/api/me/certificates", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) continue;
      const row = (data.certificates ?? []).find((item) => item.conference?.slug === slug);
      const emailedAt = row?.certificate?.emailedAt;
      if (!emailedAt) continue;
      const sentMs = new Date(emailedAt).getTime();
      if (!Number.isNaN(sentMs) && sentMs >= startedAt - 5000) return true;
    } catch {
      /* keep waiting */
    }
  }
  return false;
}

/**
 * Queue a certificate email, show success immediately, then confirm in the background.
 *
 * @param {string} slug
 * @param {{
 *   onQueued?: () => void;
 *   onConfirmed?: () => void | Promise<void>;
 *   onFailed?: (message: string) => void;
 * }} [hooks]
 */
export async function requestCertificateEmail(slug, hooks = {}) {
  const startedAt = Date.now();
  try {
    const res = await fetch(`/api/me/certificates/${encodeURIComponent(slug)}/email`, {
      method: "POST",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Email failed. Please try again."));
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = { ok: true, queued: true };
    }

    hooks.onQueued?.();
    toast.success("Certificate email has been sent.");

    if (data.queued) {
      const delivered = await waitForRecentEmail(slug, startedAt);
      if (!delivered) {
        throw new Error(
          "Email failed. Please try again. If it keeps failing, download the PDF instead.",
        );
      }
    } else if (!data.ok) {
      throw new Error(
        data.message ||
          "Email failed. Please try again. If it keeps failing, download the PDF instead.",
      );
    }

    await hooks.onConfirmed?.();
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Email failed. Please try again.";
    toast.error(message);
    hooks.onFailed?.(message);
  }
}
