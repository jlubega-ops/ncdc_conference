import Link from "next/link";
import { Calendar, CircleDot, MapPin } from "lucide-react";
import { ConferenceImage } from "@/components/ConferenceImage";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { STATUS_LABELS } from "@/lib/conferences/constants";

const statusStyles = {
  cfp_open: "bg-primary-light text-primary",
  registration_open: "bg-success/10 text-success",
  running: "bg-primary text-primary-foreground",
  submissions_closed: "bg-neutral-100 text-muted-foreground",
  upcoming: "bg-info/10 text-info",
  completed: "bg-neutral-100 text-muted-foreground",
};

/**
 * @param {object} props
 * @param {import("@/lib/data/conferences").Conference} props.conference
 * @param {"default"|"featured"} [props.variant]
 */
export function ConferenceCard({ conference, className, variant = "default" }) {
  const statusLabel = STATUS_LABELS[conference.status] ?? conference.status;
  const isFeatured = variant === "featured";

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm",
        className,
      )}
    >
      <Link
        href={`/conferences/${conference.slug}`}
        className={cn(
          "group relative block w-full overflow-hidden",
          isFeatured ? "h-48 sm:h-52" : "h-40 sm:h-44",
        )}
      >
        <ConferenceImage
          src={conference.cardImage}
          alt={conference.title}
          priority={isFeatured}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent transition-opacity group-hover:from-black/80" />
        <div
          className={cn(
            "absolute left-4 top-4 inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium",
            statusStyles[conference.status] ?? statusStyles.upcoming,
          )}
        >
          {statusLabel}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="line-clamp-2 text-base font-semibold text-white sm:text-lg">
            {conference.title}
          </h3>
        </div>
      </Link>

      <div className={cn("flex flex-1 flex-col p-4 sm:p-5", isFeatured ? "sm:p-6" : null)}>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon icon={CircleDot} size="sm" className="text-primary" />
            <span>{statusLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon icon={Calendar} size="sm" className="text-primary" />
            <span>{conference.dateRange || "Dates pending"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon icon={MapPin} size="sm" className="text-primary" />
            <span>{conference.location || "Location pending"}</span>
          </div>
        </div>

        <p
          className={cn(
            "mt-3 flex-1 text-sm text-muted-foreground",
            isFeatured ? "leading-relaxed" : null,
          )}
        >
          {conference.shortDescription}
        </p>

        <div className="mt-4">
          <Button variant="outline" size="sm" href={`/conferences/${conference.slug}`}>
            View Details
          </Button>
        </div>
      </div>
    </article>
  );
}
