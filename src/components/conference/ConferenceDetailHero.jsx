import { Calendar, MapPin, Tag } from "lucide-react";
import { ConferenceImage } from "@/components/ConferenceImage";
import { Icon } from "@/components/ui/Icon";
import { STATUS_LABELS } from "@/lib/conferences/constants";
import { formatDeadlineDate } from "@/lib/conferences/utils";
import { cn } from "@/lib/cn";

/**
 * Compact conference banner — keeps useful tab content above the fold.
 * @param {{ conference: any; compact?: boolean }} props
 */
export function ConferenceDetailHero({ conference, compact = false }) {
  const statusLabel = STATUS_LABELS[conference.status] ?? conference.status;

  return (
    <div className="relative border-b border-border">
      <div
        className={cn(
          "relative w-full overflow-hidden",
          compact
            ? "h-[110px] sm:h-[140px]"
            : "h-[140px] sm:h-[180px] md:h-[200px]",
        )}
      >
        <ConferenceImage
          src={conference.cardImage}
          alt={conference.title}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div
          className={cn(
            "mx-auto max-w-6xl px-4 sm:px-6",
            compact ? "pb-3 pt-8 sm:pb-4" : "pb-4 pt-10 sm:pb-5",
          )}
        >
          <div className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
            {statusLabel}
          </div>
          {conference.organiserLogo || conference.organiserName ? (
            <div className="mt-2 flex items-center gap-2">
              {conference.organiserLogo ? (
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/30 bg-white/90">
                  <ConferenceImage
                    src={conference.organiserLogo}
                    alt={conference.organiserName || "Organiser"}
                    objectFit="contain"
                  />
                </span>
              ) : null}
              {conference.organiserName ? (
                <p className="text-xs font-medium text-white/90 sm:text-sm">
                  {conference.organiserName}
                  {conference.organiserShortName ? ` · ${conference.organiserShortName}` : ""}
                </p>
              ) : null}
            </div>
          ) : null}
          <h1
            className={cn(
              "mt-1.5 max-w-3xl font-bold text-white",
              compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
            )}
          >
            {conference.title}
          </h1>
          {!compact && conference.shortDescription ? (
            <p className="mt-1 line-clamp-1 max-w-2xl text-xs text-white/85 sm:text-sm">
              {conference.shortDescription}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/80 sm:text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={Calendar} size="sm" />
              {conference.dateRange}
            </span>
            {conference.location ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={MapPin} size="sm" />
                {conference.location}
              </span>
            ) : null}
            {conference.category && !compact ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={Tag} size="sm" />
                {conference.category}
              </span>
            ) : null}
          </div>
          {conference.cfpCloseAt && conference.status === "cfp_open" && !compact ? (
            <p className="mt-2 text-xs text-white">
              CFP closes:{" "}
              <span className="font-semibold text-primary-light">
                {formatDeadlineDate(conference.cfpCloseAt)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
