export const CATEGORIES = [
  "Academic",
  "Education",
  "Technology",
  "Health",
  "Research",
  "Innovation",
];

export const STATUS_LABELS = {
  cfp_open: "Call for Papers Open",
  registration_open: "Registration Open",
  running: "Conference In Progress",
  submissions_closed: "Submissions Closed",
  upcoming: "Upcoming",
  completed: "Completed",
};

/** Conferences with these statuses appear in the home slider when sliderImages is set */
export const SLIDER_ELIGIBLE_STATUSES = [
  "cfp_open",
  "registration_open",
  "upcoming",
  "running",
];

export const platformStats = {
  conferencesHosted: 15,
  participants: "2,500+",
  papersSubmitted: "800+",
};

export const conferences = [
  {
    slug: "ncdc-research-conference-2027",
    title: "NCDC Research Conference 2027",
    shortDescription:
      "Annual research forum showcasing curriculum innovation and evidence-based education policy.",
    description:
      "The NCDC Research Conference brings together researchers, policymakers, and educators to share findings on curriculum development, assessment reform, and educational outcomes across Uganda and the East African region.",
    theme: "Evidence-Based Curriculum for Sustainable Development",
    dateRange: "10–12 March 2027",
    startDate: "2027-03-10",
    endDate: "2027-03-12",
    year: 2027,
    location: "Kampala Serena Hotel, Kampala",
    venue:
      "Kampala Serena Hotel — a premier conference venue in the heart of Kampala with full AV facilities and breakout rooms.",
    category: "Research",
    status: "cfp_open",
    featured: true,
    cardImage: "/assets/bg_image.jpg",
    sliderImages: ["/assets/bg_image.jpg"],
    paperDeadline: "2027-01-15",
    registrationDeadline: "2027-02-28",
    cfpTopics: [
      "Curriculum design and reform",
      "Assessment and evaluation",
      "Teacher professional development",
      "Inclusive and special needs education",
      "Digital learning and EdTech",
    ],
    submissionGuidelines:
      "Full papers (6–8 pages) and extended abstracts (2 pages) are accepted. All submissions must follow the NCDC paper template and be uploaded in PDF format. Submissions are reviewed through a double-blind peer review process.",
    deadlines: [
      { date: "2027-01-15", label: "Paper Submission Deadline" },
      { date: "2027-02-01", label: "Review Completion" },
      { date: "2027-02-15", label: "Notification of Acceptance" },
      { date: "2027-03-10", label: "Conference Starts" },
    ],
    programme: [
      {
        day: "Day 1 — 10 March",
        sessions: [
          { time: "09:00", title: "Opening Ceremony & Keynote", speaker: "Dr. Jane Nakato" },
          { time: "11:00", title: "Parallel Research Sessions A", speaker: null },
          { time: "14:00", title: "Panel: Curriculum Policy in East Africa", speaker: "Panel" },
        ],
      },
      {
        day: "Day 2 — 11 March",
        sessions: [
          { time: "09:00", title: "Keynote: Assessment Reform", speaker: "Prof. Samuel Okello" },
          { time: "11:00", title: "Poster Presentations", speaker: null },
          { time: "15:00", title: "Workshop: Writing for Publication", speaker: "Dr. Grace Mirembe" },
        ],
      },
    ],
    speakers: [
      { name: "Dr. Jane Nakato", role: "Director General, NCDC", bio: "Leading curriculum policy expert with 20+ years in education reform." },
      { name: "Prof. Samuel Okello", role: "Makerere University", bio: "Specialist in educational assessment and large-scale testing." },
    ],
    faqs: [
      { question: "Who can submit papers?", answer: "Researchers, graduate students, and practitioners in education and related fields." },
      { question: "Is there a registration fee?", answer: "Early-bird registration is UGX 150,000; standard registration is UGX 200,000." },
    ],
  },
  {
    slug: "teacher-innovation-summit-2027",
    title: "Teacher Innovation Summit",
    shortDescription:
      "A hands-on summit for educators exploring classroom innovation and pedagogical best practices.",
    description:
      "The Teacher Innovation Summit connects educators from across Uganda to share practical classroom strategies, technology integration, and learner-centred teaching approaches.",
    theme: "Empowering Teachers, Transforming Classrooms",
    dateRange: "25–27 June 2027",
    startDate: "2027-06-25",
    endDate: "2027-06-27",
    year: 2027,
    location: "Speke Resort Munyonyo, Kampala",
    venue: "Speke Resort Munyonyo — lakeside conference facilities with exhibition space.",
    category: "Education",
    status: "registration_open",
    featured: true,
    cardImage: "/assets/bg_image.jpg",
    sliderImages: ["/assets/bg_image.jpg"],
    paperDeadline: null,
    registrationDeadline: "2027-06-15",
    cfpTopics: [],
    submissionGuidelines: null,
    deadlines: [
      { date: "2027-05-01", label: "Early Registration Deadline" },
      { date: "2027-06-15", label: "Final Registration Deadline" },
      { date: "2027-06-25", label: "Summit Begins" },
    ],
    programme: [
      {
        day: "Day 1 — 25 June",
        sessions: [
          { time: "08:30", title: "Registration & Welcome", speaker: null },
          { time: "10:00", title: "Innovation Showcase", speaker: "Various presenters" },
        ],
      },
    ],
    speakers: [
      { name: "Ms. Patricia Ayo", role: "National Teacher of the Year 2026", bio: "Award-winning primary school teacher specialising in STEM education." },
    ],
    faqs: [
      { question: "Is this conference for teachers only?", answer: "Yes, the summit is designed primarily for in-service and pre-service teachers." },
    ],
  },
  {
    slug: "stem-education-conference-2027",
    title: "STEM Education Conference",
    shortDescription:
      "Advancing science, technology, engineering, and mathematics education in Ugandan schools.",
    description:
      "This conference focuses on STEM curriculum integration, laboratory infrastructure, and preparing learners for careers in science and technology.",
    theme: "Building Uganda's STEM Pipeline",
    dateRange: "14–16 September 2027",
    startDate: "2027-09-14",
    endDate: "2027-09-16",
    year: 2027,
    location: "Uganda Christian University, Mukono",
    venue: "Uganda Christian University main campus conference centre.",
    category: "Technology",
    status: "submissions_closed",
    featured: true,
    cardImage: "/assets/bg_image.jpg",
    sliderImages: [],
    paperDeadline: "2027-07-01",
    registrationDeadline: "2027-09-01",
    cfpTopics: [
      "STEM curriculum integration",
      "Laboratory and equipment standards",
      "Girls in STEM initiatives",
    ],
    submissionGuidelines: "Submissions are now closed for the 2027 edition.",
    deadlines: [
      { date: "2027-07-01", label: "Paper Submission Deadline (Closed)" },
      { date: "2027-09-14", label: "Conference Starts" },
    ],
    programme: [],
    speakers: [],
    faqs: [],
  },
  {
    slug: "education-innovation-summit-2027",
    title: "Education Innovation Summit",
    shortDescription:
      "Exploring digital transformation and innovative learning models in African education.",
    description:
      "A forward-looking summit on EdTech, blended learning, and policy frameworks for 21st-century education.",
    theme: "Digital Futures for African Learners",
    dateRange: "18–20 April 2027",
    startDate: "2027-04-18",
    endDate: "2027-04-20",
    year: 2027,
    location: "Sheraton Kampala Hotel",
    venue: "Sheraton Kampala Hotel — central location with hybrid streaming capabilities.",
    category: "Innovation",
    status: "cfp_open",
    featured: false,
    cardImage: "/assets/bg_image.jpg",
    sliderImages: ["/assets/bg_image.jpg"],
    paperDeadline: "2027-02-20",
    registrationDeadline: "2027-04-10",
    cfpTopics: ["EdTech integration", "Blended learning models", "Open educational resources"],
    submissionGuidelines: "Extended abstracts (2 pages) following the NCDC template.",
    deadlines: [
      { date: "2027-02-20", label: "Paper Submission Deadline" },
      { date: "2027-03-15", label: "Notification of Acceptance" },
      { date: "2027-04-18", label: "Summit Begins" },
    ],
    programme: [],
    speakers: [],
    faqs: [],
  },
  {
    slug: "health-education-forum-2027",
    title: "Health Education Forum",
    shortDescription:
      "Integrating health and life skills education into the national curriculum.",
    description:
      "A specialised forum for health educators, curriculum developers, and ministry officials working on health education standards.",
    theme: "Healthy Learners, Thriving Communities",
    dateRange: "5–6 August 2027",
    startDate: "2027-08-05",
    endDate: "2027-08-06",
    year: 2027,
    location: "Ministry of Health Conference Hall, Kampala",
    venue: "Ministry of Health Conference Hall.",
    category: "Health",
    status: "upcoming",
    featured: false,
    cardImage: "/assets/bg_image.jpg",
    sliderImages: ["/assets/bg_image.jpg"],
    paperDeadline: null,
    registrationDeadline: "2027-07-25",
    cfpTopics: [],
    submissionGuidelines: null,
    deadlines: [
      { date: "2027-07-25", label: "Registration Deadline" },
      { date: "2027-08-05", label: "Forum Begins" },
    ],
    programme: [],
    speakers: [],
    faqs: [],
  },
  {
    slug: "academic-leadership-conference-2026",
    title: "Academic Leadership Conference 2026",
    shortDescription:
      "Leadership development for school heads, deputies, and education administrators.",
    description:
      "Focused sessions on school management, quality assurance, and instructional leadership.",
    theme: "Leading Schools for Excellence",
    dateRange: "12–13 November 2026",
    startDate: "2026-11-12",
    endDate: "2026-11-13",
    year: 2026,
    location: "Imperial Royale Hotel, Kampala",
    venue: "Imperial Royale Hotel.",
    category: "Academic",
    status: "registration_open",
    featured: false,
    cardImage: "/assets/bg_image.jpg",
    sliderImages: ["/assets/bg_image.jpg"],
    paperDeadline: null,
    registrationDeadline: "2026-11-01",
    cfpTopics: [],
    submissionGuidelines: null,
    deadlines: [
      { date: "2026-11-01", label: "Registration Deadline" },
      { date: "2026-11-12", label: "Conference Starts" },
    ],
    programme: [],
    speakers: [],
    faqs: [],
  },
];

export function getConferenceBySlug(slug) {
  return conferences.find((c) => c.slug === slug) ?? null;
}

export function getFeaturedConferences(limit = 6) {
  return conferences.filter((c) => c.featured).slice(0, limit);
}

/**
 * Slides for the home carousel. Set `sliderImages` when creating/updating a
 * conference (upcoming or running). Each image path becomes one slide.
 */
export function getHomeSliderSlides() {
  return conferences
    .filter(
      (c) =>
        SLIDER_ELIGIBLE_STATUSES.includes(c.status) &&
        Array.isArray(c.sliderImages) &&
        c.sliderImages.length > 0,
    )
    .flatMap((c) =>
      c.sliderImages.map((image, imageIndex) => ({
        slug: c.slug,
        title: c.title,
        dateRange: c.dateRange,
        location: c.location,
        status: c.status,
        image,
        imageAlt: `${c.title} — slide ${imageIndex + 1}`,
      })),
    );
}

export function getOpenCallsForPapers() {
  return conferences
    .filter((c) => c.status === "cfp_open" && c.paperDeadline)
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      deadline: c.paperDeadline,
    }))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

export function getUpcomingDeadlines(limit = 6) {
  const allDeadlines = conferences.flatMap((c) =>
    c.deadlines.map((d) => ({ ...d, conference: c.title, slug: c.slug })),
  );
  return allDeadlines
    .filter((d) => new Date(d.date) >= new Date("2026-05-31"))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, limit);
}

export function formatDeadlineDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatFullDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
