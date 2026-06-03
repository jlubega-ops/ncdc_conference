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

/** Past conference for certificate testing (≥90% attendance, completed). */
const CERTIFICATE_DEMO_CONFERENCE = {
  slug: "certificate-demo-2026",
  title: "NCDC Certificate Demo Conference 2026",
  shortDescription:
    "Seed conference for testing attendance certificates (completed, 100% attendance).",
  description:
    "<p>Internal demo conference used to verify PDF certificates, QR verification, and email delivery.</p>",
  theme: "Quality Education for All",
  startDate: new Date("2026-05-20T00:00:00.000Z"),
  endDate: new Date("2026-05-29T00:00:00.000Z"),
  location: "Kampala, Uganda",
  venue: "NCDC Headquarters",
  category: "Demo",
  lifecycleStatus: "completed",
  publicationStatus: "PUBLISHED",
  featured: false,
  cardImage: "/assets/ncdc_image.jpg",
  timezone: "Africa/Nairobi",
  conferenceDays: [
    { date: "2026-05-20", startTime: "09:00", endTime: "17:00" },
    { date: "2026-05-21", startTime: "09:00", endTime: "17:00" },
    { date: "2026-05-22", startTime: "09:00", endTime: "17:00" },
    { date: "2026-05-23", startTime: "09:00", endTime: "17:00" },
    { date: "2026-05-26", startTime: "09:00", endTime: "17:00" },
    { date: "2026-05-27", startTime: "09:00", endTime: "17:00" },
    { date: "2026-05-28", startTime: "09:00", endTime: "17:00" },
    { date: "2026-05-29", startTime: "09:00", endTime: "13:00" },
  ],
  contacts: { emails: ["conference@ncdc.go.ug"], phone: "+256 393-112088" },
  publishedAt: new Date("2026-05-01T00:00:00.000Z"),
};

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

/**
 * Demo attendee with 100% attendance on a completed conference (certificate-ready).
 */
async function seedCertificateDemo() {
  const testEmail =
    process.env.SEED_CERTIFICATE_TEST_EMAIL?.trim().toLowerCase() ??
    "certificate.test@ncdc.go.ug";
  const testPassword = process.env.SEED_CERTIFICATE_TEST_PASSWORD ?? "Certificate123!";
  const testName = process.env.SEED_CERTIFICATE_TEST_NAME ?? "Certificate Test User";

  const conference = await prisma.conference.upsert({
    where: { slug: CERTIFICATE_DEMO_CONFERENCE.slug },
    update: CERTIFICATE_DEMO_CONFERENCE,
    create: CERTIFICATE_DEMO_CONFERENCE,
  });

  const profileData = {
    firstName: "Certificate",
    middleName: null,
    lastName: "Tester",
    gender: "M",
    fullName: "Certificate Tester",
    countryCode: "+256",
    telephone: "700000001",
    countryOfOrigin: "Uganda",
    institution: "NCDC Demo School",
  };

  const attendee = await prisma.user.upsert({
    where: { email: testEmail },
    update: {
      name: testName,
      passwordHash: await hashPassword(testPassword),
      mustChangePassword: false,
      profileData,
    },
    create: {
      email: testEmail,
      name: testName,
      passwordHash: await hashPassword(testPassword),
      mustChangePassword: false,
      profileData,
    },
  });

  await ensureRole(attendee.id, "ATTENDEE");

  await prisma.conferenceRegistration.upsert({
    where: {
      conferenceId_userId: {
        conferenceId: conference.id,
        userId: attendee.id,
      },
    },
    update: { status: "CONFIRMED" },
    create: {
      conferenceId: conference.id,
      userId: attendee.id,
      status: "CONFIRMED",
      registeredAt: new Date("2026-04-15T00:00:00.000Z"),
    },
  });

  const days = CERTIFICATE_DEMO_CONFERENCE.conferenceDays;
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i];
    await prisma.conferenceAttendance.upsert({
      where: {
        conferenceId_userId_dayDate: {
          conferenceId: conference.id,
          userId: attendee.id,
          dayDate: day.date,
        },
      },
      update: { dayIndex: i + 1 },
      create: {
        conferenceId: conference.id,
        userId: attendee.id,
        dayDate: day.date,
        dayIndex: i + 1,
        markedAt: new Date(`${day.date}T10:00:00.000Z`),
      },
    });
  }

  await prisma.conferenceCertificate.deleteMany({
    where: { conferenceId: conference.id, userId: attendee.id },
  });

  console.log("\n--- Certificate demo (seed) ---");
  console.log(`Conference: ${conference.title} (/${conference.slug})`);
  console.log(`Status: completed · ${days.length}/${days.length} days attended (100%)`);
  console.log(`Login: ${testEmail}`);
  console.log(`Password: ${testPassword}`);
  console.log("Then: Dashboard → Certificates → Download PDF");
  console.log(`Verify: /certificates/verify (after download, use certificate number on PDF)`);
  console.log("-------------------------------\n");
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

  await seedCertificateDemo();

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
