"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, CircleDot } from "lucide-react";
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
import { ConferenceAdminAttendanceTab } from "@/components/dashboard/admin-tabs/ConferenceAdminAttendanceTab";
import { ConferenceAdminCertificatesTab } from "@/components/dashboard/admin-tabs/ConferenceAdminCertificatesTab";
import { ConferenceAdminGiftsTab } from "@/components/dashboard/admin-tabs/ConferenceAdminGiftsTab";
import { ConferenceAdminTourTab } from "@/components/dashboard/admin-tabs/ConferenceAdminTourTab";
import { ConferenceAdminAdminsTab } from "@/components/dashboard/admin-tabs/ConferenceAdminAdminsTab";
import { ConferenceAdminMaterialsHub } from "@/components/dashboard/admin-tabs/ConferenceAdminMaterialsHub";
import { isAdminConferenceTabVisible } from "@/lib/conferences/feature-visibility";

const BASE_TABS = [
  { id: "info", label: "Info", countKey: null },
  { id: "registrations", label: "Registrations", countKey: "registrations" },
  { id: "attendance", label: "Attendance", countKey: null },
  { id: "certificates", label: "Certificates", countKey: "certificates" },
  { id: "gifts", label: "Gifts & awards", countKey: null },
  { id: "tour", label: "Conference tour", countKey: "tour" },
  { id: "submissions", label: "Paper submissions", countKey: "submissions" },
  { id: "feedback", label: "Feedback", countKey: "feedback" },
  { id: "materials", label: "Materials", countKey: null },
  { id: "admins", label: "Conference admins", countKey: "admins" },
];

const TAB_BACK_LINKS = {
  submissions: { href: "/dashboard/submissions", label: "Paper submissions" },
  registrations: { href: "/dashboard/registrations", label: "Registrations" },
  feedback: { href: "/dashboard/reviews", label: "Feedback" },
};

function getVisibleTabs(conference) {
  return BASE_TABS.filter((tab) => isAdminConferenceTabVisible(tab.id, conference));
}

/**
 * @param {{ conference: any; canAssignAdmins?: boolean; initialTab?: string }} props
 */
export function ConferenceAdminDetail({
  conference: initial,
  canAssignAdmins = false,
  initialTab = "info",
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conference, setConference] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const tabs = useMemo(() => getVisibleTabs(conference), [conference]);
  const validTabIds = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);
  const [activeTab, setActiveTab] = useState(
    validTabIds.has(initialTab) ? initialTab : (tabs[0]?.id ?? "info"),
  );

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const res = await fetch(`/api/admin/conferences/${conference.id}/stats`);
        const data = await res.json();
        if (!cancelled && res.ok) setStats(data);
      } catch {
        /* ignore */
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [conference.id]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && validTabIds.has(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, validTabIds]);

  useEffect(() => {
    if (!validTabIds.has(activeTab)) {
      setActiveTab(tabs[0]?.id ?? "info");
    }
  }, [activeTab, tabs, validTabIds]);

  function selectTab(tabId) {
    setActiveTab(tabId);
    router.replace(`/dashboard/manage/${conference.id}?tab=${tabId}`, { scroll: false });
  }

  const sectionBack = TAB_BACK_LINKS[activeTab];

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
        {sectionBack ? (
          <Button variant="ghost" size="sm" icon={ArrowLeft} href={sectionBack.href}>
            Back to {sectionBack.label}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" icon={ArrowLeft} href="/dashboard/manage">
            Back to listing
          </Button>
        )}
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
          <h1 className="absolute bottom-4 left-4 right-4 text-xl font-bold text-white sm:text-2xl lg:text-3xl">
            {conference.title}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 border-b border-border px-5 py-4 sm:px-6">
          <Button
            variant={isPublished ? "secondary" : "primary"}
            disabled={loading}
            onClick={togglePublication}
            className="w-full sm:w-auto"
          >
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="outline"
            icon={Pencil}
            href={`/dashboard/manage?edit=${conference.id}`}
            className="w-full sm:w-auto"
          >
            Edit conference
          </Button>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto border-b border-border px-5 sm:px-6"
          aria-label="Conference management sections"
        >
          {tabs.map((tab) => {
            let count = null;
            if (stats && tab.countKey === "registrations") count = stats.registrations?.total;
            if (stats && tab.countKey === "submissions") count = stats.submissions?.total;
            if (stats && tab.countKey === "feedback") count = stats.feedback?.total;
            if (stats && tab.countKey === "admins") count = stats.admins?.total;
            if (stats && tab.countKey === "certificates") count = stats.certificates?.issued;
            if (stats && tab.countKey === "tour") count = stats.tour?.total;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={cn(
                  "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {count != null ? (
                  <span
                    className={cn(
                      "ml-2 rounded-full px-2 py-0.5 text-xs",
                      activeTab === tab.id
                        ? "bg-primary-light text-primary"
                        : "bg-neutral-100 text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-5 sm:p-6">
          {activeTab === "info" ? <ConferenceAdminInfoTab conference={conference} /> : null}
          {activeTab === "registrations" ? (
            <ConferenceAdminRegistrationsTab
              conferenceId={conference.id}
              registrationMode={conference.registrationMode}
            />
          ) : null}
          {activeTab === "attendance" ? (
            <ConferenceAdminAttendanceTab conferenceId={conference.id} />
          ) : null}
          {activeTab === "certificates" ? (
            <ConferenceAdminCertificatesTab conferenceId={conference.id} />
          ) : null}
          {activeTab === "gifts" ? (
            <ConferenceAdminGiftsTab conferenceId={conference.id} />
          ) : null}
          {activeTab === "tour" ? (
            <ConferenceAdminTourTab conferenceId={conference.id} />
          ) : null}
          {activeTab === "submissions" ? (
            <ConferenceAdminSubmissionsTab conferenceId={conference.id} />
          ) : null}
          {activeTab === "feedback" ? (
            <ConferenceAdminFeedbackTab conferenceId={conference.id} />
          ) : null}
          {activeTab === "materials" ? (
            <ConferenceAdminMaterialsHub conferenceId={conference.id} />
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
