"use client";

import { ROLE_LABELS } from "@/lib/auth/roles";
import { getNavForRole } from "@/lib/auth/permissions";
import {
  OverviewAdminConferences,
  OverviewAttendeeRegistrations,
  OverviewAttentionList,
  OverviewReviewerQueue,
} from "@/components/dashboard/overview/OverviewSections";
import { OverviewAlerts, OverviewHero } from "@/components/dashboard/overview/OverviewHero";
import { OverviewQuickActions } from "@/components/dashboard/overview/OverviewQuickActions";
import { OverviewStatCards } from "@/components/dashboard/overview/OverviewStatCards";

/**
 * Build quick actions from nav (skip Overview), with optional badges from data.
 * @param {string} role
 * @param {any} data
 */
function buildQuickActions(role, data) {
  const nav = getNavForRole(role).filter((item) => item.href !== "/dashboard");
  const primaryHref =
    role === "ATTENDEE"
      ? "/dashboard/my-registrations"
      : role === "REVIEWER"
        ? "/dashboard/reviewer/papers"
        : role === "SUPERADMIN"
          ? "/dashboard/manage"
          : "/dashboard/registrations";

  return nav.slice(0, 4).map((item) => {
    let badge;
    if (item.href === "/dashboard/registrations" && data.registrations?.pending) {
      badge = data.registrations.pending;
    }
    if (item.href === "/dashboard/submissions" && data.papers?.pendingReview) {
      badge = data.papers.pendingReview;
    }
    if (item.href === "/dashboard/reviewer/papers" && data.papers?.awaiting) {
      badge = data.papers.awaiting;
    }
    return {
      label: item.label,
      href: item.href,
      icon: item.icon,
      primary: item.href === primaryHref,
      badge,
    };
  });
}

/**
 * @param {{
 *   session: any;
 *   data: any;
 * }} props
 */
export function DashboardOverview({ session, data }) {
  const quickActions = buildQuickActions(data.role, data);

  const attentionItems =
    data.attention?.map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
      cardImage: item.cardImage,
      meta:
        item.pendingRegistrations != null
          ? `${item.pendingRegistrations} registration(s) · ${item.pendingSubmissions ?? 0} paper(s)`
          : item.meta,
      badge: "pending",
      badgeCount: item.pendingRegistrations ?? item.pendingSubmissions,
    })) ?? [];

  return (
    <div className="space-y-8">
      <OverviewHero
        greeting={data.greeting}
        subtitle={data.subtitle}
        role={data.role}
      />

      <OverviewAlerts alerts={data.alerts} />

      <OverviewStatCards stats={data.stats} />

      <OverviewQuickActions actions={quickActions} />

      {data.role === "SUPERADMIN" ? (
        <OverviewAttentionList
          title="Conferences needing attention"
          items={attentionItems}
          empty="No pending registration backlogs across conferences."
        />
      ) : null}

      {data.role === "CONFERENCE_ADMIN" ? (
        <>
          <OverviewAdminConferences conferences={data.conferences} />
          {attentionItems.length > 0 ? (
            <OverviewAttentionList
              title="Needs attention"
              items={attentionItems}
            />
          ) : null}
        </>
      ) : null}

      {data.role === "REVIEWER" ? <OverviewReviewerQueue queue={data.queue} /> : null}

      {data.role === "ATTENDEE" ? (
        <OverviewAttendeeRegistrations registrations={data.registrations} />
      ) : null}

      {session.canSwitchRole ? (
        <p className="rounded-md border border-border bg-neutral-50/80 px-4 py-3 text-sm text-muted-foreground">
          You have multiple roles ({session.availableRoles.map((r) => ROLE_LABELS[r] ?? r).join(", ")}
          ). Use the profile menu (top right) to switch without signing out.
        </p>
      ) : null}
    </div>
  );
}
