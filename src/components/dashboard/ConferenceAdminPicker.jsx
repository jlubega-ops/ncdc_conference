import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { PUBLICATION_LABELS, STATUS_LABELS } from "@/lib/conferences/constants";

/**
 * @param {{
 *   title: string;
 *   description: string;
 *   tab: string;
 *   conferences: Array<{ id: string; title: string; slug: string; status: string; publicationStatus: string; dateRange?: string }>;
 * }} props
 */
export function ConferenceAdminPicker({ title, description, tab, conferences }) {
  const hrefFor = (id) => `/dashboard/manage/${id}?tab=${tab}`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>

      {conferences.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
          No conferences available. Create or assign a conference under Manage Conference.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {conferences.map((conf) => (
            <li key={conf.id}>
              <Link
                href={hrefFor(conf.id)}
                className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-primary-light/20"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
                  <Icon icon={Calendar} size="md" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground group-hover:text-primary">
                    {conf.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {PUBLICATION_LABELS[conf.publicationStatus] ?? conf.publicationStatus}
                    {" · "}
                    {STATUS_LABELS[conf.status] ?? conf.status}
                  </p>
                  {conf.dateRange ? (
                    <p className="mt-1 text-xs text-muted-foreground">{conf.dateRange}</p>
                  ) : null}
                </div>
                <Icon
                  icon={ChevronRight}
                  size="sm"
                  className="shrink-0 text-muted-foreground group-hover:text-primary"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/dashboard/manage" className="text-primary hover:underline">
          Manage conferences
        </Link>
      </p>
    </div>
  );
}
