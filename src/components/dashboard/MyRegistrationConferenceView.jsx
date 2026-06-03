import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConferenceImage } from "@/components/ConferenceImage";
import { ConferenceTabs } from "@/components/conference/ConferenceTabs";
import { STATUS_LABELS } from "@/lib/conferences/constants";

const REG_STATUS_LABELS = {
  PENDING: "Pending approval",
  NEEDS_REVISION: "Action required",
  CONFIRMED: "Approved",
  CANCELLED: "Cancelled",
};

/**
 * @param {{
 *   conference: any;
 *   registrationStatus: string;
 *   registration: { paymentStatus?: string | null; improvementRequest?: string | null; adminNotes?: string | null };
 *   initialTab?: string | null;
 * }} props
 */
export function MyRegistrationConferenceView({
  conference,
  registrationStatus,
  registration,
  initialTab = null,
}) {
  const slug = conference.slug;
  const base = `/dashboard/my-registrations/${slug}`;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" icon={ArrowLeft} href="/dashboard/my-registrations">
        Back to my registrations
      </Button>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="relative h-40 w-full sm:h-48">
          <ConferenceImage src={conference.cardImage} alt={conference.title} priority />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {STATUS_LABELS[conference.status] ?? conference.status}
              </span>
              <span className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-foreground">
                {REG_STATUS_LABELS[registrationStatus] ?? registrationStatus}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">{conference.title}</h1>
            <p className="mt-1 text-sm text-white/85">{conference.dateRange}</p>
          </div>
        </div>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ConferenceTabs
          conference={conference}
          registrationStatus={registrationStatus}
          registration={registration}
          isAuthenticated
          initialTab={initialTab}
          myPapersHref={`${base}/papers`}
        />
      </Suspense>
    </div>
  );
}
