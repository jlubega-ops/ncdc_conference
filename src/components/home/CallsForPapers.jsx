import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatDeadlineDate } from "@/lib/conferences/utils";

export function CallsForPapers({ calls }) {
  const safeCalls = calls ?? [];

  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Open Calls for Papers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Active submission opportunities for researchers.
            </p>
          </div>
          <Button variant="outline" size="sm" href="/call-for-papers">
            View All Calls
          </Button>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background">
              <tr>
                <th className="px-4 py-3 font-semibold text-foreground">Conference</th>
                <th className="px-4 py-3 font-semibold text-foreground">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {safeCalls.map((call) => (
                <tr key={call.slug} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/conferences/${call.slug}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {call.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDeadlineDate(call.deadline)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
