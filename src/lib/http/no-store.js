import { NextResponse } from "next/server";

/** Browser / proxy must not cache live attendee or admin JSON. */
export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
};

/**
 * @param {any} data
 * @param {import("next/server").ResponseInit} [init]
 */
export function jsonNoStore(data, init = {}) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init.headers || {}),
    },
  });
}
