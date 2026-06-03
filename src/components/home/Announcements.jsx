import { Bell } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { announcements } from "@/lib/data/resources";

function formatAnnouncementDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function Announcements() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">Recent Announcements</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest updates from conference administrators.
        </p>

        <ul className="mt-6 space-y-4">
          {announcements.map((item) => (
            <li
              key={item.id}
              className="flex gap-4 rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
                <Icon icon={Bell} size="sm" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <time className="text-xs text-muted-foreground">
                    {formatAnnouncementDate(item.date)}
                  </time>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
