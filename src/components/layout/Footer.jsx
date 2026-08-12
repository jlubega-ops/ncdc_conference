"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { footerLinks } from "@/lib/data/navigation";

export function Footer() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  if (isDashboard) {
    return (
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs sm:px-6">
          <p className="text-muted-foreground">
            &copy; {new Date().getFullYear()} Conference Management
          </p>
          <div className="flex items-center gap-3">
            {footerLinks.legal.slice(0, 3).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="flex min-w-0 max-w-xl items-start gap-3 sm:gap-4">
            <Logo size="md" showText={false} linkToHome={false} className="mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Conference Management</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Discover conferences, register for events, submit papers, and access materials from
                one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-4 sm:gap-x-12">
            <FooterLinkGroup title="About" links={footerLinks.about} />
            <FooterLinkGroup title="Legal & Support" links={footerLinks.legal} />
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Conference Management. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/**
 * @param {{ title: string; links: Array<{ label: string; href: string }> }} props
 */
function FooterLinkGroup({ title, links }) {
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
