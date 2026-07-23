export const metadata = {
  title: "About | Conference Management",
  description: "Learn about the Conference Management platform.",
};

const faqs = [
  {
    question: "What is Conference Management?",
    answer:
      "It is a centralized platform for discovering conferences, registering for events, submitting papers, tracking attendance, and accessing conference materials.",
  },
  {
    question: "Who can use this platform?",
    answer:
      "Attendees, researchers, reviewers, and conference administrators can use the platform for their roles across the conference lifecycle.",
  },
  {
    question: "How do I find a conference?",
    answer:
      "Browse the conferences list, or enter a conference code on the home page if organisers provided one with your invitation.",
  },
  {
    question: "How do I sign in?",
    answer:
      "Use the Sign in link on the home page or header. Attendees typically receive login details after registration; administrators use their staff account.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold text-foreground">About</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Conference Management helps organisers run events and helps participants discover,
            register, and stay engaged throughout the conference.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="max-w-3xl">
          <h2 className="text-lg font-semibold text-foreground">The platform</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Instead of separate sites for every event, this platform provides a single place to
            browse conferences, register, submit papers, mark attendance, download materials, and
            receive certificates when eligible. Organisers manage programmes, registrations, and
            content from one dashboard.
          </p>
        </section>

        <section id="faqs" className="mt-12 scroll-mt-24">
          <h2 className="text-lg font-semibold text-foreground">Frequently asked questions</h2>
          <dl className="mt-6 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-lg border border-border bg-surface p-5"
              >
                <dt className="text-sm font-semibold text-foreground">{faq.question}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
