import {
  Calendar,
  Globe,
  MapPin,
  Clock,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ConferenceImage } from "@/components/ConferenceImage";
import { OrganiserLogo } from "@/components/ui/OrganiserLogo";
import {
  PAID_VISIBILITY_OPTIONS,
  REGISTRATION_MODE_LABELS,
  SPEAKER_TYPE_LABELS,
} from "@/lib/conferences/constants";
import { normalizePaidContentVisibility } from "@/lib/conferences/visibility";
import {
  formatAdminDateOnly,
  formatProgrammeDayLabel,
  formatProgrammeTimeSlot,
  getSpeakersForDate,
  normalizeOnlineStream,
  normalizeBreakoutRooms,
  normalizeProgrammeForDisplay,
} from "@/lib/conferences/utils";

function formatDate(value) {
  return formatAdminDateOnly(value);
}

function DetailBlock({ label, value, icon }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-2 text-sm text-foreground">
        {icon ? <Icon icon={icon} size="sm" className="text-primary" /> : null}
        {value || "—"}
      </p>
    </div>
  );
}

/**
 * @param {{ conference: any }} props
 */
export function ConferenceAdminInfoTab({ conference }) {
  const mode = conference.registrationMode || "MANUAL_APPROVE";
  const modeLabel = REGISTRATION_MODE_LABELS[mode] ?? mode;
  const isInviteOnly = mode === "ADMIN_UPLOAD";

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2">
        <DetailBlock label="Category" value={conference.category} />
        <DetailBlock label="Main theme" value={conference.theme} />
        <DetailBlock label="Slug" value={conference.slug} />
        <DetailBlock label="Organisation" value={conference.organiserName} />
        <DetailBlock label="Org short name" value={conference.organiserShortName} />
        {conference.organiserLogo ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Organisation logo</p>
            <div className="mt-2 inline-flex max-w-[14rem] items-center rounded-md border border-border bg-surface px-2 py-1.5">
              <OrganiserLogo
                src={conference.organiserLogo}
                alt={conference.organiserName || "Organisation logo"}
                maxHeightClass="h-12"
                maxWidthClass="max-w-[13rem]"
              />
            </div>
          </div>
        ) : null}
        <DetailBlock
          label="Paper submissions"
          value={conference.allowPaperSubmissions ? "Enabled" : "Disabled"}
        />
        <DetailBlock label="Reference" value={conference.reference} />
        <DetailBlock label="Registration mode" value={modeLabel} />
        <DetailBlock
          label="Public listing"
          value={
            isInviteOnly
              ? "Hidden — invite-only (access code)"
              : "Listed on public conferences page"
          }
        />
        <DetailBlock label="Date range" value={conference.dateRange || "Dates pending"} />
        <DetailBlock label="Timezone" value={conference.timezone} />
        <DetailBlock label="Location" value={conference.location} icon={MapPin} />
        <DetailBlock label="Venue" value={conference.venue} />
        <DetailBlock
          label="Call for Papers"
          value={`${formatDate(conference.cfpOpenAt)} → ${formatDate(conference.cfpCloseAt)}`}
          icon={Calendar}
        />
        <DetailBlock
          label="Registration window"
          value={
            isInviteOnly
              ? "Not applicable (admin upload)"
              : `${formatDate(conference.registrationOpenAt)} → ${formatDate(conference.registrationCloseAt)}`
          }
          icon={Calendar}
        />
        <DetailBlock label="Featured" value={conference.featured ? "Yes" : "No"} />
        <DetailBlock label="Last updated" value={formatDate(conference.updatedAt)} icon={Clock} />
      </div>

      {isInviteOnly ? (
        <p className="mt-4 rounded-md border border-border bg-neutral-50 px-3 py-2 text-xs text-muted-foreground">
          This conference is invite-only. It does not appear in public search or the conferences
          list. Attendees open it with an access code after you upload their details.
        </p>
      ) : null}

      {conference.description ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {conference.description}
          </p>
        </div>
      ) : null}

      {conference.subThemes?.length ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Sub-themes</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {conference.subThemes.map((subTheme) => (
              <span
                key={subTheme}
                className="rounded-md bg-primary-light px-2 py-1 text-xs text-primary"
              >
                {subTheme}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {conference.cfpTopics?.length ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">CFP topics</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {conference.cfpTopics.map((topic) => (
              <span
                key={topic}
                className="rounded-md bg-primary-light px-2 py-1 text-xs text-primary"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {conference.conferenceDays?.length ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Conference days</h2>
          <ul className="mt-3 space-y-2">
            {conference.conferenceDays.map((day, index) => (
              <li
                key={`${day.date}-${index}`}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <Icon icon={Globe} size="sm" className="text-primary" />
                {formatProgrammeDayLabel(day.date)}
                {day.startTime || day.endTime
                  ? ` · ${day.startTime || "—"} – ${day.endTime || "—"}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {conference.programme?.length ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Programme</h2>
          <div className="mt-4 space-y-6">
            {normalizeProgrammeForDisplay(conference.programme).map((day) => (
              <section key={`programme-${day.date || day.label}`}>
                <h3 className="text-sm font-medium text-foreground">
                  {day.date ? formatProgrammeDayLabel(day.date) : day.label}
                </h3>
                <ul className="mt-2 space-y-2">
                  {day.items.map((item, index) => (
                    <li
                      key={`${day.date}-${item.startTime}-${index}`}
                      className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      <span className="w-24 shrink-0 pt-0.5 text-xs font-bold tabular-nums text-foreground sm:w-28">
                        {formatProgrammeTimeSlot(item.startTime, item.endTime)}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-line font-medium text-primary">
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ul>
                {day.date && getSpeakersForDate(conference.speakers, day.date).length > 0 ? (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Speakers
                    </h4>
                    <ul className="mt-2 space-y-2">
                      {getSpeakersForDate(conference.speakers, day.date).map((speaker) => (
                        <li
                          key={speaker.id}
                          className="flex gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
                            {speaker.photo ? (
                              <ConferenceImage src={speaker.photo} alt={speaker.name} />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{speaker.name}</p>
                            <p className="text-sm text-primary">{speaker.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {SPEAKER_TYPE_LABELS[speaker.speakerType] || "Speaker"}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      ) : conference.speakers?.length ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Speakers</h2>
          <ul className="mt-3 space-y-2">
            {conference.speakers.map((speaker) => (
              <li
                key={speaker.id}
                className="flex gap-3 rounded-md border border-border bg-background px-3 py-2.5"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
                  {speaker.photo ? (
                    <ConferenceImage src={speaker.photo} alt={speaker.name} />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{speaker.name}</p>
                  <p className="text-sm text-primary">{speaker.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {SPEAKER_TYPE_LABELS[speaker.speakerType] || "Speaker"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {conference.faqs?.length ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">FAQs</h2>
          <div className="mt-3 space-y-3">
            {conference.faqs.map((faq) => (
              <div
                key={faq.id || faq.question}
                className="rounded-md border border-border bg-background px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-foreground">{faq.question}</p>
                <div
                  className="prose prose-sm mt-1 max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: faq.answer }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {conference.requiresPayment ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Paid access visibility</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {PAID_VISIBILITY_OPTIONS.map((option) => {
              const visibility = normalizePaidContentVisibility(conference.paidContentVisibility);
              return (
                <li key={option.key}>
                  {option.label}: {visibility[option.key] ? "Visible" : "Hidden"}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {normalizeOnlineStream(conference.onlineStream).length > 0 ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Online streams</h2>
          <ul className="mt-3 space-y-3">
            {normalizeOnlineStream(conference.onlineStream).map((entry) => {
              const href = entry.link
                ? entry.link.startsWith("http")
                  ? entry.link
                  : `https://${entry.link}`
                : null;
              return (
                <li key={entry.id} className="text-sm">
                  <p className="font-medium text-foreground">{entry.platform || "Stream"}</p>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-block break-all text-primary hover:underline"
                    >
                      {entry.link}
                    </a>
                  ) : null}
                  {entry.description ? (
                    <p className="mt-1 whitespace-pre-wrap text-foreground/80">{entry.description}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {(() => {
        const breakout = normalizeBreakoutRooms(conference.breakoutRooms);
        if (!breakout.allowed || breakout.rooms.length === 0) return null;
        return (
          <div className="mt-6 border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-foreground">Breakout rooms</h2>
            <ul className="mt-3 space-y-3">
              {breakout.rooms.map((room) => {
                const href = room.link
                  ? room.link.startsWith("http")
                    ? room.link
                    : `https://${room.link}`
                  : null;
                return (
                  <li key={room.id} className="text-sm">
                    <p className="font-medium text-foreground">{room.platform || "Breakout room"}</p>
                    {room.topic ? (
                      <p className="mt-0.5 text-foreground/90">{room.topic}</p>
                    ) : null}
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-block break-all text-primary hover:underline"
                      >
                        {room.link}
                      </a>
                    ) : null}
                    {room.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-foreground/80">
                        {room.description}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}

      {conference.requiresPayment && conference.paymentDetails ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Payment details</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              ["Account name", conference.paymentDetails.accountName],
              ["Account number", conference.paymentDetails.accountNumber],
              ["Bank name", conference.paymentDetails.bankName],
              ["Bank branch", conference.paymentDetails.bankBranch],
              ["SWIFT code", conference.paymentDetails.swiftCode],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 text-sm text-foreground">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {conference.contacts &&
      (conference.contacts.emails?.length ||
        conference.contacts.phone ||
        conference.contacts.website ||
        conference.contacts.moreInfo) ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Conference contacts</h2>
          <dl className="mt-3 space-y-3">
            {conference.contacts.emails?.length ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {conference.contacts.emails.join(", ")}
                </dd>
              </div>
            ) : null}
            {conference.contacts.phone ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tel
                </dt>
                <dd className="mt-1 text-sm text-foreground">{conference.contacts.phone}</dd>
              </div>
            ) : null}
            {conference.contacts.website ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Website
                </dt>
                <dd className="mt-1 text-sm text-primary">
                  {conference.contacts.website.startsWith("http") ? (
                    <a
                      href={conference.contacts.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {conference.contacts.website}
                    </a>
                  ) : (
                    <a
                      href={`https://${conference.contacts.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {conference.contacts.website}
                    </a>
                  )}
                </dd>
              </div>
            ) : null}
            {conference.contacts.moreInfo ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  More info
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {conference.contacts.moreInfo}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {conference.submissionGuidelines ? (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Submission guidelines</h2>
          <div
            className="prose prose-sm mt-2 max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: conference.submissionGuidelines }}
          />
        </div>
      ) : null}
    </div>
  );
}
