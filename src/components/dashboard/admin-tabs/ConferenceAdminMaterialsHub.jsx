"use client";

import { ConferenceAdminResourcesTab } from "@/components/dashboard/admin-tabs/ConferenceAdminResourcesTab";
import { ConferenceAdminSpeakersPresentationsTab } from "@/components/dashboard/admin-tabs/ConferenceAdminSpeakersPresentationsTab";
import { AdminCollapsibleSection } from "@/components/dashboard/admin-tabs/AdminCollapsibleSection";
import { RESOURCE_TYPES } from "@/lib/conference-content/constants";

/**
 * @param {{ conferenceId: string }} props
 */
export function ConferenceAdminMaterialsHub({ conferenceId }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Manage files and session content for approved members. Expand a section to upload or
        edit.
      </p>

      <AdminCollapsibleSection
        title="Materials"
        description="Handouts, guides, and general conference files."
        defaultOpen
      >
        <ConferenceAdminResourcesTab
          conferenceId={conferenceId}
          type={RESOURCE_TYPES.MATERIAL}
          title="Materials"
          emptyHint="Upload handouts, guides, or other files for approved members."
          nested
        />
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="Paper templates"
        description="Templates for paper submissions."
      >
        <ConferenceAdminResourcesTab
          conferenceId={conferenceId}
          type={RESOURCE_TYPES.PAPER_TEMPLATE}
          title="Paper templates"
          emptyHint="Upload paper submission templates for members."
          nested
        />
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="Presentation templates"
        description="Slide templates for presenters."
      >
        <ConferenceAdminResourcesTab
          conferenceId={conferenceId}
          type={RESOURCE_TYPES.PRESENTATION_TEMPLATE}
          title="Presentation templates"
          emptyHint="Upload slide templates for presenters."
          nested
        />
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="Speakers & presentations"
        description="Speaker profiles and session slides members can browse after approval."
      >
        <ConferenceAdminSpeakersPresentationsTab conferenceId={conferenceId} nested />
      </AdminCollapsibleSection>
    </div>
  );
}
