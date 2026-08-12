import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" size="sm" icon={ArrowLeft} href={`/conferences/${conference.slug}`}>
            Conference home
          </Button>
          <Button variant="outline" size="sm" href="/access">
            Sign in with access code
          </Button>
        </div>
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
          <Button variant="secondary" href={`/conferences/${conference.slug}`} className="mt-6" icon={ArrowLeft}>
            Conference home
          </Button>
        </div>
      )}
    </PublicFormLayout>
  );
}
