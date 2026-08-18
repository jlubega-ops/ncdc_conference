import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getPublishedConferenceBySlug,
  getPublishedConferences,
} from "@/lib/conferences/service";
import {
  getMemberContentAvailability,
  listConferencePresentations,
  listConferenceResources,
} from "@/lib/conference-content/service";
import { RESOURCE_TYPES } from "@/lib/conference-content/constants";

const LIST_TAG = "published-conferences";

function slugTag(slug) {
  return `conference:${slug}`;
}

function contentTag(conferenceId) {
  return `conference-content:${conferenceId}`;
}

/**
 * Drop shared conference caches. Does not touch attendance, certificates, or registrations.
 * @param {{ id?: string | null; slug?: string | null }} [opts]
 */
export function revalidateConferenceCache(opts = {}) {
  const slug = opts.slug ? String(opts.slug) : "";
  const id = opts.id ? String(opts.id) : "";

  revalidateTag(LIST_TAG, "max");
  revalidatePath("/conferences");
  revalidatePath("/call-for-papers");

  if (slug) {
    revalidateTag(slugTag(slug), "max");
    revalidatePath(`/conferences/${slug}`);
  }
  if (id) {
    revalidateTag(contentTag(id), "max");
  }
}

/**
 * @param {string} conferenceId
 */
export async function revalidateConferenceCacheById(conferenceId) {
  if (!conferenceId) return;
  const row = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { slug: true },
  });
  revalidateConferenceCache({ id: conferenceId, slug: row?.slug ?? null });
}

/**
 * @deprecated Use revalidateConferenceCache
 * @param {string} [slug]
 */
export function revalidatePublishedConferenceCache(slug) {
  revalidateConferenceCache({ slug });
}

export const getPublishedConferencesCached = unstable_cache(
  async () => getPublishedConferences(),
  ["published-conferences-list"],
  { revalidate: false, tags: [LIST_TAG] },
);

/**
 * @param {string} slug
 */
export function getPublishedConferenceBySlugCached(slug) {
  return unstable_cache(
    async () => getPublishedConferenceBySlug(slug),
    ["published-conference", slug],
    {
      revalidate: false,
      tags: [LIST_TAG, slugTag(slug)],
    },
  )();
}

/**
 * Shared materials catalogue (not file bytes, not per-user).
 * @param {string} conferenceId
 */
export function getMemberContentCatalogCached(conferenceId) {
  return unstable_cache(
    async () => {
      const listOpts = { includeFileAccess: false };
      const [materials, paperTemplates, presentationTemplates, presentations, availability] =
        await Promise.all([
          listConferenceResources(conferenceId, RESOURCE_TYPES.MATERIAL, listOpts),
          listConferenceResources(conferenceId, RESOURCE_TYPES.PAPER_TEMPLATE, listOpts),
          listConferenceResources(
            conferenceId,
            RESOURCE_TYPES.PRESENTATION_TEMPLATE,
            listOpts,
          ),
          listConferencePresentations(conferenceId, listOpts),
          getMemberContentAvailability(conferenceId),
        ]);
      return {
        materials,
        paperTemplates,
        presentationTemplates,
        presentations,
        availability,
      };
    },
    ["conference-member-content", conferenceId],
    { revalidate: false, tags: [contentTag(conferenceId)] },
  )();
}

/**
 * @param {string} conferenceId
 */
export async function getMemberContentAvailabilityCached(conferenceId) {
  const catalog = await getMemberContentCatalogCached(conferenceId);
  return catalog.availability;
}
