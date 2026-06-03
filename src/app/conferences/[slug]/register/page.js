import Link from "next/link";
import { notFound } from "next/navigation";
import { ConferenceRegistrationForm } from "@/components/conference/ConferenceRegistrationForm";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";
import { Button } from "@/components/ui/Button";
import { getPublishedConferenceBySlug } from "@/lib/conferences/service";
import { isRegistrableConference } from "@/lib/conferences/registrable";
import { formatFullDate } from "@/lib/conferences/utils";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);
  if (!conference) return { title: "Conference Not Found" };
  return {
    title: `Register — ${conference.title} | NCDC Conference`,
    description: `Register for ${conference.title}.`,
  };
}

export default async function ConferenceRegisterPage({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);

  if (!conference) notFound();

  const canRegister = isRegistrableConference(conference);
  const subtitle = [
    conference.dateRange,
    conference.registrationCloseAt
      ? `Registration closes ${formatFullDate(conference.registrationCloseAt)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PublicFormLayout
      eyebrow="Conference registration"
      title={conference.title}
      subtitle={subtitle}
      conference={conference}
      maxWidth="xl"
      footer={
        <>
          <Link href={`/conferences/${conference.slug}`} className="hover:text-primary">
            ← Back to conference
          </Link>
          {" · "}
          <Link href="/login" className="hover:text-primary">
            Sign in
          </Link>
        </>
      }
    >
      {canRegister ? (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            Complete the form below. Fields marked with * are required. Your registration will be
            reviewed. New applicants receive sign-in details by email; your application stays pending until an administrator approves it.
          </p>
          <ConferenceRegistrationForm conference={conference} />
        </>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Registration is not open. Registration and call for papers must both be active for this
            conference.
          </p>
          <Button variant="outline" href={`/conferences/${conference.slug}`} className="mt-6">
            Back to conference
          </Button>
        </div>
      )}
    </PublicFormLayout>
  );
}
