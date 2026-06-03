import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ConferenceImage } from "@/components/ConferenceImage";
import { cn } from "@/lib/cn";

const REG_STATUS_CLASS = {
  PENDING: "bg-amber-50 text-amber-900 border-amber-200",
  NEEDS_REVISION: "bg-amber-50 text-amber-900 border-amber-200",
  CONFIRMED: "bg-primary-light text-primary border-primary/25",
  CANCELLED: "bg-neutral-100 text-muted-foreground border-border",
};

/**
 * @param {{ title: string; items: Array<{ id: string; title: string; href: string; cardImage?: string; meta?: string; badge?: string; badgeCount?: number }>; empty?: string }} props
 */
export function OverviewAttentionList({ title, items, empty }) {
  if (!items?.length) {
    return empty ? (
      <section className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {empty}
      </section>
    ) : null;
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50/80"
            >
              {item.cardImage !== undefined ? (
                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-border">
                  <ConferenceImage src={item.cardImage} alt="" />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{item.title}</p>
                {item.meta ? <p className="text-xs text-muted-foreground">{item.meta}</p> : null}
              </div>
              {item.badgeCount != null && item.badgeCount > 0 ? (
                <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                  {item.badgeCount} {item.badge ?? "pending"}
                </span>
              ) : null}
              <Icon icon={ChevronRight} size="sm" className="shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * @param {{ registrations: Array<any> }} props
 */
export function OverviewAttendeeRegistrations({ registrations }) {
  if (!registrations?.length) {
    return (
      <section className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted-foreground">
          You have not registered for a conference yet.
        </p>
        <Button variant="primary" href="/conferences" className="mt-4">
          Browse conferences
        </Button>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">My conferences</h2>
        <Link href="/dashboard/my-registrations" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {registrations.slice(0, 4).map((reg) => (
          <Link
            key={reg.id}
            href={reg.href}
            className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow hover:border-primary/30 hover:shadow-md"
          >
            <div className="relative h-28 w-full">
              <ConferenceImage src={reg.conference.cardImage} alt={reg.conference.title} />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
              <span
                className={cn(
                  "absolute left-3 top-3 rounded-md border px-2 py-0.5 text-xs font-medium",
                  REG_STATUS_CLASS[reg.status] ?? REG_STATUS_CLASS.PENDING,
                )}
              >
                {reg.statusLabel}
              </span>
            </div>
            <div className="p-4">
              <p className="font-semibold text-foreground line-clamp-2">{reg.conference.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{reg.conference.dateRange}</p>
              {reg.paperCount > 0 ? (
                <p className="mt-2 text-xs text-primary">{reg.paperCount} paper submission(s)</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * @param {{ queue: Array<any> }} props
 */
export function OverviewReviewerQueue({ queue }) {
  if (!queue?.length) {
    return (
      <section className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          No papers assigned yet. You will see them here when a conference admin assigns you as
          reviewer.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Assigned papers</h2>
        <Button variant="ghost" size="sm" href="/dashboard/reviewer/papers">
          View all
          <Icon icon={ArrowRight} size="sm" />
        </Button>
      </div>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
        {queue.slice(0, 6).map((paper) => (
          <li key={paper.id}>
            <Link
              href={paper.href}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-neutral-50/80"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{paper.title}</p>
                <p className="text-xs text-muted-foreground">
                  {paper.conferenceTitle} · {paper.authorName}
                </p>
              </div>
              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-foreground">
                {paper.statusLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * @param {{ conferences: Array<any> }} props
 */
export function OverviewAdminConferences({ conferences }) {
  if (!conferences?.length) {
    return (
      <section className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No conferences assigned to you yet. Contact a super admin for access.
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Your conferences</h2>
        <Link href="/dashboard/manage" className="text-xs font-medium text-primary hover:underline">
          Manage all
        </Link>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {conferences.slice(0, 6).map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className="overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary/40"
          >
            <div className="relative h-24">
              <ConferenceImage src={c.cardImage} alt={c.title} />
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-foreground line-clamp-2">{c.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.dateRange}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-medium">
                {c.pendingRegistrations > 0 ? (
                  <span className="rounded bg-primary-light px-1.5 py-0.5 text-primary">
                    {c.pendingRegistrations} reg.
                  </span>
                ) : null}
                {c.pendingSubmissions > 0 ? (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-900">
                    {c.pendingSubmissions} papers
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
