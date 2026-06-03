"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  CircleDot,
} from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ConferenceImage } from "@/components/ConferenceImage";
import { cn } from "@/lib/cn";
import {
  PUBLICATION_LABELS,
  STATUS_LABELS,
} from "@/lib/conferences/constants";
import { validateConferenceForPublish } from "@/lib/conferences/validation";
import { ConferenceAdminInfoTab } from "@/components/dashboard/admin-tabs/ConferenceAdminInfoTab";
import { ConferenceAdminRegistrationsTab } from "@/components/dashboard/admin-tabs/ConferenceAdminRegistrationsTab";
import { ConferenceAdminSubmissionsTab } from "@/components/dashboard/admin-tabs/ConferenceAdminSubmissionsTab";
import { ConferenceAdminFeedbackTab } from "@/components/dashboard/admin-tabs/ConferenceAdminFeedbackTab";
import { ConferenceAdminAdminsTab } from "@/components/dashboard/admin-tabs/ConferenceAdminAdminsTab";

const BASE_TABS = [
  { id: "info", label: "Info" },
  { id: "registrations", label: "Registrations" },
  { id: "submissions", label: "Submitted Papers" },
  { id: "feedback", label: "Evaluations & comments" },
  { id: "admins", label: "Conference admins" },
];

/**
 * @param {{ conference: any, canAssignAdmins?: boolean }} props
 */
export function ConferenceAdminDetail({ conference: initial, canAssignAdmins = false }) {
  const router = useRouter();
  const [conference, setConference] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const tabs = useMemo(() => BASE_TABS, []);

  async function togglePublication() {
    const nextStatus = conference.publicationStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    if (nextStatus === "PUBLISHED") {
      const publishErrors = validateConferenceForPublish(conference);
      if (Object.keys(publishErrors).length > 0) {
        toast.error(
          Object.values(publishErrors)[0] ||
            "Complete all required fields before publishing.",
        );
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/conferences/${conference.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...conference, publicationStatus: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update publication status.");
      setConference(data.conference);
      toast.success(
        data.message ||
          (nextStatus === "PUBLISHED"
            ? "Conference published successfully."
            : "Conference unpublished successfully."),
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update publication status.");
    } finally {
      setLoading(false);
    }
  }

  const isPublished = conference.publicationStatus === "PUBLISHED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" icon={ArrowLeft} href="/dashboard/manage">
          Back to listing
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="relative h-48 w-full sm:h-56">
          <ConferenceImage src={conference.cardImage} alt={conference.title} />
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground">
              <Icon icon={CircleDot} size="sm" className="text-primary" />
              {PUBLICATION_LABELS[conference.publicationStatus] ?? conference.publicationStatus}
            </span>
            <span className="rounded-md bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">
              {STATUS_LABELS[conference.status] ?? conference.status}
            </span>
          </div>
          <h1 className="absolute bottom-4 left-4 right-4 text-2xl font-bold text-white sm:text-3xl">
            {conference.title}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 border-b border-border px-5 py-4 sm:px-6">
          <Button
            variant={isPublished ? "secondary" : "primary"}
            disabled={loading}
            onClick={togglePublication}
          >
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button variant="outline" icon={Pencil} href={`/dashboard/manage?edit=${conference.id}`}>
            Edit conference
          </Button>
          {isPublished ? (
            <Button variant="ghost" href={`/conferences/${conference.slug}`}>
              View public page
            </Button>
          ) : null}
        </div>

        <nav
          className="flex gap-1 overflow-x-auto border-b border-border px-5 sm:px-6"
          aria-label="Conference management sections"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-5 sm:p-6">
          {activeTab === "info" ? <ConferenceAdminInfoTab conference={conference} /> : null}
          {activeTab === "registrations" ? (
            <ConferenceAdminRegistrationsTab conferenceId={conference.id} />
          ) : null}
          {activeTab === "submissions" ? (
            <ConferenceAdminSubmissionsTab conferenceId={conference.id} />
          ) : null}
          {activeTab === "feedback" ? (
            <ConferenceAdminFeedbackTab conferenceId={conference.id} />
          ) : null}
          {activeTab === "admins" ? (
            <ConferenceAdminAdminsTab
              conferenceId={conference.id}
              canAssign={canAssignAdmins}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
