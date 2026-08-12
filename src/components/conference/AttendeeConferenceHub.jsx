"use client";

import {
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  HelpCircle,
  Info,
  MessageSquareText,
  UserCheck,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const TAB_META = {
  overview: {
    label: "Overview",
    description: "Theme, venue, and stream",
    icon: Info,
  },
  cfp: {
    label: "Call for papers",
    description: "Submit and track papers",
    icon: FileText,
  },
  programme: {
    label: "Programme",
    description: "Schedule and speakers",
    icon: CalendarDays,
  },
  registration: {
    label: "Registration",
    description: "Your registration status",
    icon: ClipboardList,
  },
  attendance: {
    label: "Attendance",
    description: "Daily check-in",
    icon: UserCheck,
  },
  certificates: {
    label: "Certificates",
    description: "Download your certificate",
    icon: FileText,
  },
  feedback: {
    label: "Feedback",
    description: "Share your evaluation",
    icon: MessageSquareText,
  },
  materials: {
    label: "Materials",
    description: "Downloads and slides",
    icon: FolderOpen,
  },
  faqs: {
    label: "FAQs",
    description: "Common questions",
    icon: HelpCircle,
  },
};

/**
 * Full-viewport-friendly card grid for confirmed attendees.
 * @param {{
 *   tabs: Array<{ id: string; label: string }>;
 *   onSelect: (tabId: string) => void;
 *   conferenceTitle?: string;
 * }} props
 */
export function AttendeeConferenceHub({ tabs, onSelect, conferenceTitle }) {
  const count = tabs.length;
  // Prefer 2 columns on mobile so every card stays on-screen; 3 on larger screens when many tabs.
  const gridClass =
    count <= 4
      ? "grid-cols-2 sm:grid-cols-2"
      : count <= 6
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col justify-center py-4 sm:min-h-[calc(100dvh-14rem)] sm:py-6">
      <div className="mb-4 text-center sm:mb-6 sm:text-left">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Your conference
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
          What would you like to open?
        </h2>
        {conferenceTitle ? (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{conferenceTitle}</p>
        ) : null}
      </div>

      <div className={cn("grid gap-3 sm:gap-4", gridClass)}>
        {tabs.map((tab) => {
          const meta = TAB_META[tab.id] || {
            label: tab.label,
            description: "Open this section",
            icon: Info,
          };
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={cn(
                "group flex min-h-[5.5rem] flex-col items-start gap-2 rounded-lg border border-border bg-surface p-3 text-left shadow-sm",
                "transition-colors hover:border-primary/40 hover:bg-primary-light/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                "sm:min-h-[6.5rem] sm:p-4",
              )}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary-light text-primary sm:h-10 sm:w-10">
                <Icon icon={meta.icon} size="md" />
              </span>
              <span className="text-sm font-semibold text-foreground group-hover:text-primary sm:text-base">
                {tab.label || meta.label}
              </span>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {tab.id === "attendance" && tab.label?.includes("certificate")
                  ? "Check in and download certificates"
                  : meta.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
