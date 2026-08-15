const MAX_CONCURRENT_PDFS = 4;
let active = 0;
/** @type {Array<() => void>} */
const waiters = [];

/**
 * Limit how many certificate PDFs generate at once so evening downloads
 * queue instead of exhausting RAM/CPU. Cached PDFs skip this queue.
 * @template T
 * @param {() => Promise<T>} fn
 */
export async function withCertificatePdfSlot(fn) {
  while (active >= MAX_CONCURRENT_PDFS) {
    await new Promise((resolve) => {
      waiters.push(resolve);
    });
  }
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    const next = waiters.shift();
    if (next) next();
  }
}
