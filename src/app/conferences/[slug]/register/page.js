import Link from "next/link";
import { notFound } from "next/navigation";
import { ConferenceRegistrationForm } from "@/components/conference/ConferenceRegistrationForm";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";
import { Button } from "@/components/ui/Button";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { getPublishedConferenceBySlug, isInviteOnlyConference } from "@/lib/conferences/service";
import {
  allowsPublicRegistration,
  isRegistrableConference,
} from "@/lib/conferences/registrable";
import { formatFullDate } from "@/lib/conferences/utils";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);
  if (!conference || isInviteOnlyConference(conference)) {
    return { title: "Conference Not Found" };
  }
  return {
    title: `Register — ${conference.title} | Conference Management`,
    description: `Register for ${conference.title}.`,
  };
}

export default async function ConferenceRegisterPage({ params }) {
  await redirectIfAuthenticated();

  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);

  if (!conference || isInviteOnlyConference(conference)) notFound();

  const publicReg = allowsPublicRegistration(conference);
  const canRegister = publicReg && isRegistrableConference(conference);
  const autoApprove = conference.registrationMode === "AUTO_APPROVE";
  const subtitle = [
    conference.dateRange,
    conference.registrationCloseAt
      ? `Registration closes ${formatFullDate(conference.registrationCloseAt)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  let closedMessage = "Registration is not open for this conference.";
  if (!publicReg) {
    closedMessage = "This conference does not require registration.";
  }

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
          <Link href="/login?mode=access" className="hover:text-primary">
            Sign in with access code
          </Link>
        </>
      }
    >
      {canRegister ? (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            Complete the form below. Fields marked with * are required.{" "}
            {autoApprove
              ? "You will be approved immediately and receive an access code by email."
              : "Your application will be reviewed. After approval you receive an access code by email to sign in."}
          </p>
          <ConferenceRegistrationForm conference={conference} />
        </>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">{closedMessage}</p>
          <Button variant="outline" href={`/conferences/${conference.slug}`} className="mt-6">
            Back to conference
          </Button>
        </div>
      )}
    </PublicFormLayout>
  );
}
