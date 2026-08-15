import { unstable_cache, revalidateTag } from "next/cache";
import {
  getPublishedConferenceBySlug,
  getPublishedConferences,
} from "@/lib/conferences/service";

const PUBLISHED_CONFERENCES_CACHE_TAG = "published-conferences";

export const getPublishedConferencesCached = unstable_cache(
  async () => getPublishedConferences(),
  ["published-conferences-list"],
  { revalidate: 60, tags: [PUBLISHED_CONFERENCES_CACHE_TAG] },
);

/**
 * @param {string} slug
 */
export function getPublishedConferenceBySlugCached(slug) {
  return unstable_cache(
    async () => getPublishedConferenceBySlug(slug),
    ["published-conference", slug],
    {
      revalidate: 30,
      tags: [PUBLISHED_CONFERENCES_CACHE_TAG, `conference:${slug}`],
    },
  )();
}

/**
 * @param {string} [slug]
 */
export function revalidatePublishedConferenceCache(slug) {
  revalidateTag(PUBLISHED_CONFERENCES_CACHE_TAG, "max");
  if (slug) revalidateTag(`conference:${slug}`, "max");
}
