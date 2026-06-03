export const metadata = {
  title: "About | NCDC Conference Platform",
  description:
    "Learn about the NCDC Conference Management Platform and the National Curriculum Development Centre.",
};

const faqs = [
  {
    question: "What is the NCDC Conference Management Platform?",
    answer:
      "It is a centralized platform for discovering conferences, submitting research papers, registering for events, and accessing conference materials hosted by the National Curriculum Development Centre, Uganda.",
  },
  {
    question: "Who can use this platform?",
    answer:
      "Researchers, educators, conference attendees, and event organizers can all use the platform for their respective roles in the conference lifecycle.",
  },
  {
    question: "How do I submit a research paper?",
    answer:
      "Visit the Call for Papers page to find open submission opportunities, review the guidelines, and submit through the conference's submission portal.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold text-foreground">About NCDC</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The National Curriculum Development Centre (NCDC) is Uganda&apos;s
            lead agency for curriculum design, development, and review.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="max-w-3xl">
          <h2 className="text-lg font-semibold text-foreground">
            Conference Management Platform
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This platform serves as a conference hub for all NCDC-hosted events.
            Rather than separate websites for each conference, users can discover
            events, submit papers, register, and download resources from a single
            entry point — making it easier for researchers and educators across
            Uganda and the region to participate.
          </p>
        </section>

        <section id="faqs" className="mt-12 scroll-mt-24">
          <h2 className="text-lg font-semibold text-foreground">
            Frequently Asked Questions
          </h2>
          <dl className="mt-6 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-lg border border-border bg-surface p-5"
              >
                <dt className="text-sm font-semibold text-foreground">
                  {faq.question}
                </dt>
                <dd className="mt-2 text-sm text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
