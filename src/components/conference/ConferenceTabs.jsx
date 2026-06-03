"use client";

import { useEffect, useState } from "react";
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
import { canViewConferenceContent } from "@/lib/conferences/visibility";
import { resources } from "@/lib/data/resources";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "cfp", label: "Call for Papers" },
  { id: "programme", label: "Programme" },
  { id: "registration", label: "Registration" },
  { id: "materials", label: "Materials" },
  { id: "faqs", label: "FAQs" },
];

function OverviewTab({ conference }) {
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
      <OnlineStreamSection conference={conference} />
    </div>
  );
}

function CfpTab({ conference }) {
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
      {conference.status === "cfp_open" ? (
        <Button variant="primary" href="/login?tab=access">
          Submit Paper — Sign in
        </Button>
      ) : null}
    </div>
  );
}

function ProgrammeTab({ conference }) {
  const programmeDays = normalizeProgrammeForDisplay(conference.programme);
  const showProgramme = canViewConferenceContent(conference, "viewProgramme");
  const showSpeakers = canViewConferenceContent(conference, "viewSpeakers");
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
          Programme details are available after registration payment is confirmed.
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

function RegistrationTab({ conference }) {
  const payment = conference.paymentDetails;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Register to attend {conference.title}. Complete the registration form to
        secure your place at the event.
      </p>
      {conference.registrationCloseAt ? (
        <p className="text-sm text-foreground">
          Registration closes:{" "}
          <span className="font-medium">
            {formatFullDate(conference.registrationCloseAt)}
          </span>
        </p>
      ) : null}

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

      <OnlineStreamSection conference={conference} />

      {conference.status === "upcoming" || conference.status === "running" ? (
        <Button variant="primary" href={`/conferences/${conference.slug}/register`}>
          Register to attend
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Registration is not currently open for this conference.
        </p>
      )}
    </div>
  );
}

function MaterialsTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {resources.map((resource) => (
        <div
          key={resource.id}
          className="rounded-md border border-border bg-background p-4"
        >
          <h3 className="text-sm font-semibold text-foreground">{resource.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{resource.description}</p>
          <Button variant="outline" size="sm" href={resource.href} className="mt-3">
            Download
          </Button>
        </div>
      ))}
    </div>
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

function getVisibleTabs(conference) {
  const programmeDays = normalizeProgrammeForDisplay(conference.programme);
  const hasVisibleSpeakers =
    canViewConferenceContent(conference, "viewSpeakers") &&
    Array.isArray(conference.speakers) &&
    conference.speakers.length > 0;
  return tabs.filter((tab) => {
    if (tab.id !== "programme") return true;
    if (canViewConferenceContent(conference, "viewProgramme") && programmeDays.length > 0) {
      return true;
    }
    return hasVisibleSpeakers;
  });
}

export function ConferenceTabs({ conference }) {
  const visibleTabs = getVisibleTabs(conference);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id ?? "overview");

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
        {activeTab === "overview" ? <OverviewTab conference={conference} /> : null}
        {activeTab === "cfp" ? <CfpTab conference={conference} /> : null}
        {activeTab === "programme" ? <ProgrammeTab conference={conference} /> : null}
        {activeTab === "registration" ? <RegistrationTab conference={conference} /> : null}
        {activeTab === "materials" ? <MaterialsTab /> : null}
        {activeTab === "faqs" ? <FaqsTab conference={conference} /> : null}
      </div>
    </div>
  );
}
