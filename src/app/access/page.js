import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccessKeyLoginForm } from "@/components/auth/AccessKeyLoginForm";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";
import { getCurrentSession } from "@/lib/auth/session";
import { getPublishedConferenceBySlugCached } from "@/lib/conferences/public-cache";
import {
  conferenceMetadataIcons,
  organiserBrandFromConference,
} from "@/lib/conferences/brand";
import { conferenceSlugFromPath } from "@/lib/conferences/path";
import { OrganiserBrandSetter } from "@/components/layout/OrganiserBrandProvider";

export const dynamic = "force-dynamic";

function safeInternalRedirect(value) {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) return null;
  return path;
}

async function conferenceFromRedirect(redirectTo) {
  const slug = conferenceSlugFromPath(redirectTo);
  if (!slug) return null;
  try {
    return await getPublishedConferenceBySlugCached(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const redirectTo = safeInternalRedirect(params?.redirect ? String(params.redirect) : "");
  const conference = await conferenceFromRedirect(redirectTo);
  if (conference) {
    return {
      title: `Access | ${conference.organiserName || conference.title}`,
      description: `Sign in to ${conference.title}`,
      icons: conferenceMetadataIcons(conference),
    };
  }
  return {
    title: "Access with code | Conference Management",
    description: "Enter your access code to open your conference.",
  };
}

export default async function AccessWithCodePage({ searchParams }) {
  const params = await searchParams;
  const redirectTo = safeInternalRedirect(
    params?.redirect ? String(params.redirect) : "",
  );
  const expired = params?.reason === "session_expired";
  const conference = await conferenceFromRedirect(redirectTo);

  let session = null;
  try {
    session = await getCurrentSession();
  } catch (err) {
    if (err && typeof err === "object" && err.digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    /* allow page */
  }
  if (session) {
    // Honour deep-link return when already signed in.
    redirect(redirectTo || getDefaultDashboardPath(session));
  }

  return (
    <>
      {conference ? (
        <OrganiserBrandSetter brand={organiserBrandFromConference(conference)} />
      ) : null}
      <PublicFormLayout
      maxWidth="md"
      eyebrow={conference?.organiserName || "Attendee access"}
      title="Sign in with access code"
      subtitle={
        conference
          ? `Enter the access code emailed for ${conference.title}.`
          : "Enter the access code from your email. You will be signed in and returned to the page you were trying to open."
      }
      footer={
        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/" className="font-medium hover:text-primary">
            ← Back to home
          </Link>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <Link href="/login" className="font-medium hover:text-primary">
            Staff sign in
          </Link>
        </span>
      }
    >
      {expired ? (
        <p className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
          Your session expired due to inactivity. Enter your access code to continue.
        </p>
      ) : null}

      {redirectTo ? (
        <p className="mb-4 rounded-md bg-primary-light px-3 py-2 text-xs text-primary">
          After signing in you will continue to{" "}
          <span className="font-medium break-all">{redirectTo}</span>
        </p>
      ) : null}

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <AccessKeyLoginForm />
      </Suspense>
    </PublicFormLayout>
    </>
  );
}
