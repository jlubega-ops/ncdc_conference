import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CONFERENCES = [
  {
    slug: "ncdc-research-conference-2027",
    title: "NCDC Research Conference 2027",
    shortDescription:
      "National forum for curriculum research, policy innovation, and evidence-based education reform.",
    description:
      "The NCDC Research Conference brings together curriculum experts, researchers, and education leaders from Uganda and the region.",
    theme: "Curriculum and Assessment Innovation",
    startDate: new Date("2027-03-10T00:00:00.000Z"),
    endDate: new Date("2027-03-12T00:00:00.000Z"),
    location: "Kampala, Uganda",
    venue: "NCDC Main Auditorium",
    category: "Research",
    lifecycleStatus: "cfp_open",
    publicationStatus: "PUBLISHED",
    featured: true,
    cardImage: "/assets/ncdc_image.jpg",
    cfpOpenAt: new Date("2026-11-01T00:00:00.000Z"),
    cfpCloseAt: new Date("2027-01-31T00:00:00.000Z"),
    registrationOpenAt: new Date("2027-02-01T00:00:00.000Z"),
    registrationCloseAt: new Date("2027-02-20T00:00:00.000Z"),
    conferenceDays: [
      { date: "2027-03-10", startTime: "09:00", endTime: "17:00" },
      { date: "2027-03-11", startTime: "09:00", endTime: "17:00" },
      { date: "2027-03-12", startTime: "09:00", endTime: "13:00" },
    ],
    cfpTopics: ["Assessment Reform", "STEM Curriculum", "Inclusive Education"],
    submissionGuidelines: "<p>Submit original work in PDF format, 6-10 pages.</p>",
    programme: [
      { date: "2027-03-10", startTime: "09:00", endTime: "10:30", title: "Opening ceremony" },
    ],
    speakers: [
      {
        id: "seed-speaker-1",
        name: "Dr. Jane Nambalirwa",
        title: "Director of Research, NCDC",
        speakerType: "keynote",
        scheduleMode: "all",
        dates: [],
      },
    ],
    faqs: [{ id: "seed-faq-1", question: "Who can attend?", answer: "<p>Researchers, lecturers, and policymakers.</p>" }],
    contacts: {
      emails: ["conference@ncdc.go.ug"],
      phone: "+256 393-112088",
      website: "www.ncdc.go.ug",
    },
    publishedAt: new Date(),
  },
  {
    slug: "teacher-innovation-summit-2027",
    title: "Teacher Innovation Summit",
    shortDescription: "Showcasing practical teaching innovations for competency-based learning.",
    description: "A summit for teachers exploring classroom innovation across Uganda.",
    startDate: new Date("2027-06-15T00:00:00.000Z"),
    endDate: new Date("2027-06-16T00:00:00.000Z"),
    location: "Jinja, Uganda",
    venue: "Nile Conference Centre",
    category: "Education",
    lifecycleStatus: "registration_open",
    publicationStatus: "PUBLISHED",
    featured: true,
    cardImage: "/assets/ncdc_image.jpg",
    registrationOpenAt: new Date("2027-04-01T00:00:00.000Z"),
    registrationCloseAt: new Date("2027-06-01T00:00:00.000Z"),
    conferenceDays: [{ date: "2027-06-15", startTime: "08:30", endTime: "17:00" }],
    contacts: { emails: ["conference@ncdc.go.ug"], phone: "+256 393-112088" },
    publishedAt: new Date(),
  },
  {
    slug: "stem-education-conference-2027",
    title: "STEM Education Conference",
    shortDescription: "Accelerating STEM teaching quality in secondary schools.",
    description: "STEM conference for educators and curriculum specialists.",
    startDate: new Date("2027-09-14T00:00:00.000Z"),
    endDate: new Date("2027-09-16T00:00:00.000Z"),
    location: "Kampala, Uganda",
    venue: "Serena Conference Centre",
    category: "Technology",
    lifecycleStatus: "upcoming",
    publicationStatus: "PUBLISHED",
    featured: false,
    cardImage: "/assets/ncdc_image.jpg",
    conferenceDays: [{ date: "2027-09-14", startTime: "09:00", endTime: "17:00" }],
    publishedAt: new Date(),
  },
  {
    slug: "education-innovation-summit-2027",
    title: "Education Innovation Summit",
    lifecycleStatus: "upcoming",
    publicationStatus: "DRAFT",
  },
  {
    slug: "health-education-forum-2027",
    title: "Health Education Forum",
    lifecycleStatus: "upcoming",
    publicationStatus: "DRAFT",
  },
  {
    slug: "academic-leadership-conference-2026",
    title: "Academic Leadership Conference 2026",
    lifecycleStatus: "completed",
    publicationStatus: "DRAFT",
  },
];

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function ensureRole(userId, role, conferenceId = null) {
  const existing = await prisma.userRole.findFirst({
    where: { userId, role, conferenceId },
  });
  if (!existing) {
    await prisma.userRole.create({ data: { userId, role, conferenceId } });
  }
}

async function main() {
  console.log("Seeding database…");

  for (const c of CONFERENCES) {
    await prisma.conference.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
  }

  const email =
    process.env.SEED_SUPERADMIN_EMAIL?.trim().toLowerCase() ?? "admin@ncdc.go.ug";
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_SUPERADMIN_NAME ?? "NCDC Super Admin";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash: await hashPassword(password) },
    create: { email, name, passwordHash: await hashPassword(password) },
  });

  await ensureRole(user.id, "SUPERADMIN");

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
