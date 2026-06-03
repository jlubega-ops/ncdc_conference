import Link from "next/link";
import { notFound } from "next/navigation";
import { ConferenceRegistrationForm } from "@/components/conference/ConferenceRegistrationForm";
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

  return (
    <div className="bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <p className="text-sm font-medium text-primary">Registration</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{conference.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{conference.dateRange}</p>
          {conference.registrationCloseAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Closes {formatFullDate(conference.registrationCloseAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {canRegister ? (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              Complete the form below. Fields marked with * are required. Your registration
              will be reviewed and you will receive an access key by email once approved.
            </p>
            <ConferenceRegistrationForm conference={conference} />
          </>
        ) : (
          <div className="rounded-lg border border-border bg-surface p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Registration is not open. Only upcoming or currently running conferences accept
              new registrations.
            </p>
            <Button variant="outline" href={`/conferences/${conference.slug}`} className="mt-6">
              Back to conference
            </Button>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href={`/conferences/${conference.slug}`} className="hover:text-primary">
            ← Back to conference
          </Link>
        </p>
      </div>
    </div>
  );
}
