import { prisma } from "@/lib/prisma";
import { mapConferenceForUi } from "@/lib/conferences/service";

/**
 * @param {string} userId
 * @param {{ approvedOnly?: boolean }} [options]
 */
export async function getAttendeeRegistrationsForPicker(userId, options = {}) {
  const { approvedOnly = false } = options;

  const rows = await prisma.conferenceRegistration.findMany({
    where: {
      userId,
      ...(approvedOnly ? { status: "CONFIRMED" } : {}),
    },
    include: {
      conference: true,
    },
    orderBy: { registeredAt: "desc" },
  });

  return rows.map((row) => {
    const mapped = mapConferenceForUi(row.conference);
    return {
      id: row.id,
      status: row.status,
      conference: {
        id: mapped.id,
        slug: mapped.slug,
        title: mapped.title,
        cardImage: mapped.cardImage,
        dateRange: mapped.dateRange,
      },
    };
  });
}
