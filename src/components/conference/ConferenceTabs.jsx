"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { SPEAKER_TYPE_LABELS } from "@/lib/conferences/constants";
import {
  formatFullDate,
  formatProgrammeDayLabel,
  formatProgrammeTimeSlot,
  getSpeakersForDate,
  normalizeProgrammeForDisplay,
} from "@/lib/conferences/utils";
import { ConferenceImage } from "@/components/ConferenceImage";
import { OnlineStreamSection } from "@/components/conference/OnlineStreamSection";
import { isCfpOpen, isRegistrableConference } from "@/lib/conferences/registrable";
import { canViewConferenceContent } from "@/lib/conferences/visibility";
import {
  ConferenceMemberMaterials,
  ConferenceMemberPresentations,
} from "@/components/conference/ConferenceMemberContent";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "cfp", label: "Call for Papers" },
  { id: "programme", label: "Programme" },
  { id: "registration", label: "Registration" },
  { id: "materials", label: "Materials" },
  { id: "presentations", label: "Presentations" },
  { id: "faqs", label: "FAQs" },
];

function OverviewTab({ conference, registrationStatus }) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-foreground">Description</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {conference.description}
        </p>
      </section>
      {conference.theme ? (
        <section>
          <h2 className="text-lg font-semibold text-foreground">Main theme</h2>
          <p className="mt-3 text-sm text-muted-foreground">{conference.theme}</p>
        </section>
      ) : null}
      {conference.subThemes?.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-foreground">Sub-themes</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {conference.subThemes.map((subTheme) => (
              <li key={subTheme}>{subTheme}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Venue</h2>
        <p className="mt-3 text-sm text-muted-foreground">{conference.venue}</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-foreground">Dates</h2>
        <p className="mt-3 text-sm text-muted-foreground">{conference.dateRange}</p>
      </section>
      <OnlineStreamSection conference={conference} registrationStatus={registrationStatus} />
    </div>
  );
}

const REG_STATUS_UI = {
  PENDING: {
    title: "Registration pending approval",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    body: "Your application is being reviewed. You can submit papers after approval.",
  },
  NEEDS_REVISION: {
    title: "Action required on your registration",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    body: "Please check your dashboard for organiser feedback and update your application.",
  },
  CONFIRMED: {
    title: "Registration approved",
    className: "border-primary/30 bg-primary-light text-primary",
    body: "You are registered for this conference.",
  },
  CANCELLED: {
    title: "Registration cancelled",
    className: "border-error/30 bg-error/10 text-error",
    body: null,
  },
};

function RegistrationStatusBanner({ status, improvementRequest }) {
  const ui = REG_STATUS_UI[status];
  if (!ui) return null;
  return (
    <div className={cn("rounded-md border px-4 py-3", ui.className)}>
      <p className="font-semibold">{ui.title}</p>
      {ui.body ? <p className="mt-1 text-sm opacity-90">{ui.body}</p> : null}
      {improvementRequest ? (
        <p className="mt-2 text-sm">
          <span className="font-medium">Feedback: </span>
          {improvementRequest}
        </p>
      ) : null}
    </div>
  );
}

function CfpTab({ conference, registrationStatus, isAuthenticated, myPapersHref }) {
  const cfpOpen = isCfpOpen(conference);
  const approved = registrationStatus === "CONFIRMED";

  return (
    <div className="space-y-8">
      {conference.cfpTopics.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-foreground">Topics</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {conference.cfpTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          No call for papers is currently open for this conference.
        </p>
      )}
      {conference.submissionGuidelines ? (
        <section>
          <h2 className="text-lg font-semibold text-foreground">Submission Guidelines</h2>
          <div
            className="prose prose-sm mt-3 max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: conference.submissionGuidelines }}
          />
        </section>
      ) : null}
      {conference.cfpOpenAt || conference.cfpCloseAt ? (
        <section>
          <h2 className="text-lg font-semibold text-foreground">Important dates</h2>
          <ul className="mt-3 space-y-2">
            {conference.cfpOpenAt ? (
              <li className="flex justify-between gap-4 rounded-md border border-border bg-background px-4 py-3 text-sm">
                <span className="text-foreground">Call for papers opens</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatFullDate(conference.cfpOpenAt)}
                </span>
              </li>
            ) : null}
            {conference.cfpCloseAt ? (
              <li className="flex justify-between gap-4 rounded-md border border-border bg-background px-4 py-3 text-sm">
                <span className="text-foreground">Call for papers closes</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatFullDate(conference.cfpCloseAt)}
                </span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
      <section className="rounded-md border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-foreground">Submit a paper</h3>
        {!isAuthenticated ? (
          <p className="mt-2 text-sm text-muted-foreground">
            <Link href={`/login?redirect=/conferences/${conference.slug}?tab=cfp`} className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to view and submit your papers for this conference.
          </p>
        ) : !registrationStatus ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Register for this conference before submitting a paper.
          </p>
        ) : !approved ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Paper submission opens after your registration is approved.
          </p>
        ) : !cfpOpen ? (
          <p className="mt-2 text-sm text-muted-foreground">
            The call for papers is not currently open.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              View papers you have submitted, track review status, and add new submissions.
            </p>
            <Button
              variant="primary"
              className="mt-3"
              href={myPapersHref ?? `/dashboard/my-registrations/${conference.slug}/papers`}
            >
              Submit paper for this conference
            </Button>
          </>
        )}
      </section>
    </div>
  );
}

function ProgrammeTab({ conference, registrationStatus }) {
  const programmeDays = normalizeProgrammeForDisplay(conference.programme);
  const showProgramme = canViewConferenceContent(conference, "viewProgramme", registrationStatus);
  const showSpeakers = canViewConferenceContent(conference, "viewSpeakers", registrationStatus);
  const approved = registrationStatus === "CONFIRMED";
  const speakers = Array.isArray(conference.speakers) ? conference.speakers : [];
  const conferenceDays = Array.isArray(conference.conferenceDays) ? conference.conferenceDays : [];

  return (
    <div className="space-y-8">
      {showProgramme ? (
        programmeDays.length > 0 ? (
        programmeDays.map((day) => {
          const dayLabel = day.date ? formatProgrammeDayLabel(day.date) : day.label;
          const daySpeakers =
            showSpeakers && day.date ? getSpeakersForDate(conference.speakers, day.date) : [];

          return (
            <section key={day.date || day.label}>
              <h2 className="text-lg font-semibold text-foreground">{dayLabel}</h2>
              <ul className="mt-4 space-y-2">
                {day.items.map((session, index) => (
                  <li
                    key={`${session.startTime}-${session.title}-${index}`}
                    className="flex items-center gap-4 rounded-md border border-border bg-background px-4 py-3 text-sm"
                  >
                    <span className="w-24 shrink-0 text-xs font-bold tabular-nums text-foreground sm:w-28">
                      {formatProgrammeTimeSlot(session.startTime, session.endTime)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-primary">{session.title}</p>
                      {session.speaker ? (
                        <p className="mt-1 text-xs text-muted-foreground">{session.speaker}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              {daySpeakers.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-foreground">Speakers</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {daySpeakers.map((speaker) => (
                      <div
                        key={speaker.id}
                        className="flex gap-3 rounded-md border border-border bg-background p-4"
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
                          {speaker.photo ? (
                            <ConferenceImage src={speaker.photo} alt={speaker.name} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-xs text-muted-foreground">
                              —
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">{speaker.name}</p>
                          <p className="text-sm text-primary">{speaker.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {SPEAKER_TYPE_LABELS[speaker.speakerType] || "Speaker"}
                          </p>
                          {speaker.bio ? (
                            <p className="mt-2 text-sm text-muted-foreground">{speaker.bio}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })
      ) : (
        <p className="text-sm text-muted-foreground">
          Programme details will be published closer to the event date.
        </p>
      )) : (
        <p className="text-sm text-muted-foreground">
          {approved
            ? "Programme details are not available for this conference yet."
            : registrationStatus
              ? "Programme details unlock after your registration is approved by the organisers."
              : conference.requiresPayment
                ? "Programme details are available after you register and your application is approved."
                : "Programme details unlock after you register and your application is approved."}
        </p>
      )}

      {showSpeakers && speakers.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-foreground">Speakers</h2>
          <div className="mt-4 space-y-4">
            {conferenceDays.filter((day) => day?.date).map((day) => {
              const daySpeakers = getSpeakersForDate(speakers, day.date);
              if (daySpeakers.length === 0) return null;
              return (
                <div key={`speakers-${day.date}`}>
                  <h3 className="text-sm font-medium text-foreground">
                    {formatProgrammeDayLabel(day.date)}
                  </h3>
                  <div className="mt-2 grid gap-4 sm:grid-cols-2">
                    {daySpeakers.map((speaker) => (
                      <div
                        key={`${day.date}-${speaker.id}`}
                        className="flex gap-3 rounded-md border border-border bg-background p-4"
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
                          {speaker.photo ? (
                            <ConferenceImage src={speaker.photo} alt={speaker.name} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-xs text-muted-foreground">
                              —
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">{speaker.name}</p>
                          <p className="text-sm text-primary">{speaker.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {SPEAKER_TYPE_LABELS[speaker.speakerType] || "Speaker"}
                          </p>
                          {speaker.bio ? (
                            <p className="mt-2 text-sm text-muted-foreground">{speaker.bio}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PaymentStatusBlock({ conference, registrationStatus, paymentStatus }) {
  if (!conference.requiresPayment) return null;
  const approved = registrationStatus === "CONFIRMED";
  const paid =
    approved &&
    (!paymentStatus ||
      paymentStatus === "verified" ||
      paymentStatus === "paid" ||
      paymentStatus === "confirmed");
  const label = !approved
    ? "Pending approval"
    : paid
      ? "Paid"
      : "Pending payment verification";

  return (
    <section className="rounded-md border border-border bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground">Payment status</h3>
      <p
        className={cn(
          "mt-2 inline-block rounded-md px-2.5 py-1 text-sm font-medium",
          !approved
            ? "bg-amber-50 text-amber-800"
            : paid
              ? "bg-primary-light text-primary"
              : "bg-neutral-100 text-muted-foreground",
        )}
      >
        {label}
      </p>
      {!approved ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Payment will be confirmed when your registration is approved.
        </p>
      ) : paid ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Payment confirmed with your approved registration.
        </p>
      ) : null}
    </section>
  );
}

function RegistrationTab({ conference, registrationStatus, registration, isAuthenticated }) {
  const payment = conference.paymentDetails;
  const hasRegistration = Boolean(registrationStatus);
  const canRegister = isRegistrableConference(conference) && !hasRegistration;

  return (
    <div className="space-y-6">
      {hasRegistration && isAuthenticated ? (
        <RegistrationStatusBanner
          status={registrationStatus}
          improvementRequest={registration?.improvementRequest}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Register to attend {conference.title}. Complete the registration form to secure your
          place at the event.
        </p>
      )}
      {conference.registrationCloseAt ? (
        <p className="text-sm text-foreground">
          Registration closes:{" "}
          <span className="font-medium">
            {formatFullDate(conference.registrationCloseAt)}
          </span>
        </p>
      ) : null}

      <PaymentStatusBlock
        conference={conference}
        registrationStatus={registrationStatus}
        paymentStatus={registration?.paymentStatus}
      />

      {conference.requiresPayment && payment ? (
        <section className="rounded-md border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">Payment details</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the bank details below when completing your registration payment.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Account name", payment.accountName],
              ["Account number", payment.accountNumber],
              ["Bank name", payment.bankName],
              ["Bank branch", payment.bankBranch],
              ["SWIFT code", payment.swiftCode],
            ].map(([label, value]) =>
              value ? (
                <div key={label}>
                  <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </section>
      ) : null}

      {conference.contacts &&
      (conference.contacts.emails?.length ||
        conference.contacts.phone ||
        conference.contacts.website ||
        conference.contacts.moreInfo) ? (
        <section className="rounded-md border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">Conference contacts</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {conference.contacts.emails?.length ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Email</dt>
                <dd className="text-foreground">
                  {conference.contacts.emails.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="block text-primary hover:underline"
                    >
                      {email}
                    </a>
                  ))}
                </dd>
              </div>
            ) : null}
            {conference.contacts.phone ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Tel</dt>
                <dd className="text-foreground">{conference.contacts.phone}</dd>
              </div>
            ) : null}
            {conference.contacts.website ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Website</dt>
                <dd>
                  <a
                    href={
                      conference.contacts.website.startsWith("http")
                        ? conference.contacts.website
                        : `https://${conference.contacts.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {conference.contacts.website}
                  </a>
                </dd>
              </div>
            ) : null}
            {conference.contacts.moreInfo ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">More info</dt>
                <dd className="whitespace-pre-wrap text-muted-foreground">
                  {conference.contacts.moreInfo}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <OnlineStreamSection conference={conference} registrationStatus={registrationStatus} />

      {canRegister ? (
        <Button variant="primary" href={`/conferences/${conference.slug}/register`}>
          Register to attend
        </Button>
      ) : hasRegistration ? null : (
        <p className="text-sm text-muted-foreground">
          Registration is not currently open. Both registration and call for papers must be
          active.
        </p>
      )}
      {hasRegistration && isAuthenticated ? (
        <Link
          href="/dashboard/my-registrations"
          className="block text-sm text-primary hover:underline"
        >
          View all my registrations
        </Link>
      ) : null}
    </div>
  );
}

function MaterialsTab({ slug, registrationStatus }) {
  return (
    <ConferenceMemberMaterials slug={slug} registrationStatus={registrationStatus} />
  );
}

function PresentationsTab({ slug, registrationStatus }) {
  return (
    <ConferenceMemberPresentations slug={slug} registrationStatus={registrationStatus} />
  );
}

function FaqsTab({ conference }) {
  return conference.faqs.length > 0 ? (
    <dl className="space-y-4">
      {conference.faqs.map((faq) => (
        <div
          key={faq.id || faq.question}
          className="rounded-md border border-border bg-background p-4"
        >
          <dt className="text-sm font-semibold text-foreground">{faq.question}</dt>
          <dd
            className="prose prose-sm mt-2 max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: faq.answer }}
          />
        </div>
      ))}
    </dl>
  ) : (
    <p className="text-sm text-muted-foreground">
      FAQs for this conference will be published soon.
    </p>
  );
}

function getVisibleTabs(conference, isAuthenticated) {
  const programmeDays = normalizeProgrammeForDisplay(conference.programme);
  const hasSpeakers =
    Array.isArray(conference.speakers) && conference.speakers.length > 0;
  return tabs.filter((tab) => {
    if (tab.id === "programme") {
      return programmeDays.length > 0 || hasSpeakers;
    }
    if (tab.id === "materials" || tab.id === "presentations") {
      return isAuthenticated;
    }
    return true;
  });
}

/**
 * @param {{
 *   conference: any;
 *   registrationStatus?: string | null;
 *   registration?: { paymentStatus?: string | null; improvementRequest?: string | null } | null;
 *   isAuthenticated?: boolean;
 *   initialTab?: string | null;
 *   myPapersHref?: string;
 * }} props
 */
export function ConferenceTabs({
  conference,
  registrationStatus = null,
  registration = null,
  isAuthenticated = false,
  initialTab = null,
  myPapersHref = null,
}) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || initialTab;
  const visibleTabs = getVisibleTabs(conference, isAuthenticated);
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && visibleTabs.some((t) => t.id === tabFromUrl)
      ? tabFromUrl
      : visibleTabs[0]?.id ?? "overview",
  );

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && visibleTabs.some((tab) => tab.id === t)) {
      setActiveTab(t);
    }
  }, [searchParams, visibleTabs]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? "overview");
    }
  }, [activeTab, visibleTabs]);

  return (
    <div>
      <nav
        className="flex gap-1 overflow-x-auto border-b border-border"
        aria-label="Conference sections"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="py-8">
        {activeTab === "overview" ? (
          <OverviewTab conference={conference} registrationStatus={registrationStatus} />
        ) : null}
        {activeTab === "cfp" ? (
          <CfpTab
            conference={conference}
            registrationStatus={registrationStatus}
            isAuthenticated={isAuthenticated}
            myPapersHref={myPapersHref}
          />
        ) : null}
        {activeTab === "programme" ? (
          <ProgrammeTab conference={conference} registrationStatus={registrationStatus} />
        ) : null}
        {activeTab === "registration" ? (
          <RegistrationTab
            conference={conference}
            registrationStatus={registrationStatus}
            registration={registration}
            isAuthenticated={isAuthenticated}
          />
        ) : null}
        {activeTab === "materials" ? (
          <MaterialsTab slug={conference.slug} registrationStatus={registrationStatus} />
        ) : null}
        {activeTab === "presentations" ? (
          <PresentationsTab slug={conference.slug} registrationStatus={registrationStatus} />
        ) : null}
        {activeTab === "faqs" ? <FaqsTab conference={conference} /> : null}
      </div>
    </div>
  );
}
