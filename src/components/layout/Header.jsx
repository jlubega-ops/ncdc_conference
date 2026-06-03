"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { useSession } from "@/components/auth/SessionProvider";
import { mainNavLinks } from "@/lib/data/navigation";
import { getNavForRole } from "@/lib/auth/permissions";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, session } = useSession();

  const roleNav = isAuthenticated && session
    ? getNavForRole(session.activeRole)
        .filter((item) => item.href !== "/dashboard/conferences")
        .slice(0, 4)
    : [];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Logo size="md" />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {mainNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-neutral-50 hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated
              ? roleNav.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))
              : null}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" href="/dashboard">
                  Dashboard
                </Button>
                <ProfileMenu />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" href="/dashboard">
                  Dashboard
                </Button>
                <Button variant="outline" size="sm" href="/login">
                  Sign in
                </Button>
                <Button variant="primary" size="sm" href="/conferences">
                  Register
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated ? <ProfileMenu /> : null}
            <button
              type="button"
              className="rounded-md p-2 text-foreground hover:bg-neutral-50"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <Icon icon={mobileOpen ? X : Menu} size="md" />
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <nav
            className="border-t border-border py-4 lg:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1">
              {mainNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-neutral-50"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && session
                ? getNavForRole(session.activeRole).map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-neutral-50"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))
                : null}
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                <Button variant="ghost" size="sm" href="/dashboard">
                  Dashboard
                </Button>
                {!isAuthenticated ? (
                  <>
                    <Button variant="outline" size="sm" href="/login">
                      Sign in
                    </Button>
                    <Button variant="primary" size="sm" href="/conferences">
                      Register
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
