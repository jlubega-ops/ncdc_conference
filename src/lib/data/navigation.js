/** Links shown to visitors who are not signed in */
export const publicNavLinks = [
  { label: "Home", href: "/" },
  { label: "Conferences", href: "/conferences" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about" },
];

/** Compact header links when signed in as attendee */
export const attendeeHeaderNav = [
  { label: "Conferences", href: "/conferences" },
  { label: "My registrations", href: "/dashboard/my-registrations" },
];

/** Compact header links when signed in as staff */
export const staffHeaderNav = [
  { label: "Conferences", href: "/conferences" },
  { label: "Dashboard", href: "/dashboard" },
];

const STAFF_ROLES = new Set(["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER"]);

/**
 * @param {{ activeRole?: string } | null} session
 */
export function getHeaderNavLinks(session) {
  if (!session?.activeRole) return publicNavLinks;
  if (STAFF_ROLES.has(session.activeRole)) return staffHeaderNav;
  return attendeeHeaderNav;
}

/** @deprecated Use publicNavLinks */
export const mainNavLinks = publicNavLinks;

export const footerLinks = {
  about: [
    { label: "About NCDC", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "FAQs", href: "/about#faqs" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Support", href: "/contact#support" },
  ],
};
