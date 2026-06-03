import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ConferenceImage } from "@/components/ConferenceImage";
import { Icon } from "@/components/ui/Icon";

const STATUS_LABELS = {
  PENDING: "Pending approval",
  NEEDS_REVISION: "Action required",
  CONFIRMED: "Approved",
  CANCELLED: "Cancelled",
};

/**
 * @param {string} slug
 * @param {"papers" | "programme" | "materials"} target
 */
export function attendeeConferenceHref(slug, target) {
  const base = `/dashboard/my-registrations/${slug}`;
  if (target === "papers") return `${base}/papers`;
  return `${base}?tab=${target}`;
}

/**
 * @param {{
 *   title: string;
 *   description: string;
 *   emptyMessage: string;
 *   emptyAction?: { label: string; href: string };
 *   registrations: Array<{ id: string; status: string; conference: { slug: string; title: string; cardImage?: string | null; dateRange?: string } }>;
 *   target: "papers" | "programme" | "materials";
 * }} props
 */
export function AttendeeConferencePicker({
  title,
  description,
  emptyMessage,
  emptyAction,
  registrations,
  target,
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>

      {registrations.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          <p>{emptyMessage}</p>
          {emptyAction ? (
            <Link href={emptyAction.href} className="mt-3 inline-block font-medium text-primary hover:underline">
              {emptyAction.label}
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {registrations.map((row) => (
            <li key={row.id}>
              <Link
                href={attendeeConferenceHref(row.conference.slug, target)}
                className="group flex overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary/40 hover:shadow-sm"
              >
                <div className="relative hidden h-auto w-24 shrink-0 sm:block">
                  <ConferenceImage
                    src={row.conference.cardImage}
                    alt={row.conference.title}
                  />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground group-hover:text-primary">
                      {row.conference.title}
                    </p>
                    {row.conference.dateRange ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.conference.dateRange}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      {STATUS_LABELS[row.status] ?? row.status}
                    </p>
                  </div>
                  <Icon
                    icon={ChevronRight}
                    size="sm"
                    className="shrink-0 text-muted-foreground group-hover:text-primary"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
