import { Calendar, MapPin, Tag } from "lucide-react";
import { ConferenceImage } from "@/components/ConferenceImage";
import { Icon } from "@/components/ui/Icon";
import { STATUS_LABELS } from "@/lib/conferences/constants";
import { formatDeadlineDate } from "@/lib/conferences/utils";

export function ConferenceDetailHero({ conference }) {
  const statusLabel = STATUS_LABELS[conference.status] ?? conference.status;

  return (
    <div className="relative border-b border-border">
      <div className="relative aspect-[21/9] max-h-[360px] min-h-[220px] w-full sm:min-h-[280px]">
        <ConferenceImage
          src={conference.cardImage}
          alt={conference.title}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 sm:pb-10">
          <div className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            {statusLabel}
          </div>
          <h1 className="mt-4 max-w-3xl text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            {conference.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/90 sm:text-base">
            {conference.shortDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/85">
            <span className="inline-flex items-center gap-2">
              <Icon icon={Calendar} size="sm" />
              {conference.dateRange}
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon icon={MapPin} size="sm" />
              {conference.location}
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon icon={Tag} size="sm" />
              {conference.category}
            </span>
          </div>
          {conference.cfpCloseAt && conference.status === "cfp_open" ? (
            <p className="mt-4 text-sm text-white">
              Call for papers closes:{" "}
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
