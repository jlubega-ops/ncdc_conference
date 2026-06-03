import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { buildOpenCalls, getPublishedConferences } from "@/lib/conferences/service";
import { formatDeadlineDate } from "@/lib/conferences/utils";

export const metadata = {
  title: "Call for Papers | NCDC Conference Platform",
  description: "Browse open calls for papers across NCDC-hosted conferences.",
};

export default async function CallForPapersPage() {
  const conferences = await getPublishedConferences();
  const calls = buildOpenCalls(conferences);

  return (
    <div className="bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold text-foreground">Call for Papers</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Find active submission opportunities and submit your research to
            NCDC-hosted conferences.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {calls.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground">Conference</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Deadline</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
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
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        href={`/conferences/${call.slug}`}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            No open calls for papers at this time.
          </p>
        )}
      </div>
    </div>
  );
}
