import Link from "next/link";
import { formatDeadlineDate } from "@/lib/conferences/utils";

export function ImportantDates({ deadlines }) {
  const items = deadlines ?? [];

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">Upcoming Deadlines</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Key dates across all active conferences.
        </p>

        <ol className="relative mt-8 space-y-0 border-l-2 border-primary/20 pl-6">
          {items.map((item, index) => (
            <li key={`${item.slug}-${item.date}-${index}`} className="relative pb-8 last:pb-0">
              <span className="absolute -left-[1.4rem] top-1 flex size-3 rounded-full bg-primary ring-4 ring-background" />
              <p className="text-sm font-semibold text-primary">
                {formatDeadlineDate(item.date)}
              </p>
              <p className="mt-1 text-sm text-foreground">{item.label}</p>
              <Link
                href={`/conferences/${item.slug}`}
                className="mt-1 inline-block text-xs text-muted-foreground hover:text-primary"
              >
                {item.conference}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
