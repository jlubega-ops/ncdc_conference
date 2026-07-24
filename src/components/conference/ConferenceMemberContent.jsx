"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { MEMBER_CONTENT_SECTIONS } from "@/lib/conference-content/constants";
import {
  formatPresentationSpeaker,
  groupPresentationsByDay,
} from "@/lib/conference-content/presentation-days";

/**
 * @param {{
 *   title: string;
 *   description?: string;
 *   count: number;
 *   defaultOpen?: boolean;
 *   children: import("react").ReactNode;
 * }} props
 */
function MemberContentSection({ title, description, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-surface px-4 py-3 text-left hover:bg-neutral-50/80"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {description ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
            {count}
          </span>
          <Icon
            icon={ChevronDown}
            size="sm"
            className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </span>
      </button>
      {open ? <div className="border-t border-border bg-background p-4">{children}</div> : null}
    </section>
  );
}

/**
 * @param {{ items: Array<{ id: string; title: string; description?: string | null; downloadUrl: string }> }} props
 */
function ResourceFileList({ items }) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            {item.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" href={item.downloadUrl} target="_blank">
            Download
          </Button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Presentations browser grouped by session (same organization as admin uploads).
 * @param {{ presentations: any[] }} props
 */
function PresentationsBrowser({ presentations }) {
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({});

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = presentations.filter((p) => {
      if (!q) return true;
      const speakerLine = formatPresentationSpeaker(p.speakerName, p.speakerTitle).toLowerCase();
      return (
        p.title?.toLowerCase().includes(q) ||
        speakerLine.includes(q) ||
        p.dayLabel?.toLowerCase().includes(q) ||
        p.sessionLabel?.toLowerCase().includes(q)
      );
    });
    return groupPresentationsByDay(filtered);
  }, [presentations, search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Icon
          icon={Search}
          size="sm"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          placeholder="Search by title, speaker, or day…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm"
        />
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">No presentations match your search.</p>
      ) : (
        <div className="space-y-2">
          {grouped.map(([group, items]) => {
            const isOpen = openGroups[group] !== false;
            return (
              <div key={group} className="rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [group]: !isOpen }))}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-neutral-50/80"
                >
                  <span>
                    {group}
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({items.length})
                    </span>
                  </span>
                  <Icon
                    icon={ChevronDown}
                    size="sm"
                    className={cn("transition-transform", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen ? (
                  <ul className="divide-y divide-border border-t border-border">
                    {items.map((p) => (
                      <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                        <Icon icon={FileText} size="sm" className="mt-0.5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{p.title}</p>
                          {p.speakerName ? (
                            <p className="text-xs text-muted-foreground">
                              {formatPresentationSpeaker(p.speakerName, p.speakerTitle)}
                            </p>
                          ) : null}
                          {p.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {p.description}
                            </p>
                          ) : null}
                        </div>
                        {p.downloadUrl ? (
                          <Button variant="outline" size="sm" href={p.downloadUrl} target="_blank">
                            View
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No file</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Attendee materials hub — same categories as admin; empty categories are omitted.
 * @param {{
 *   slug: string;
 *   registrationStatus: string | null;
 *   canAccessContent?: boolean;
 * }} props
 */
export function ConferenceMemberMaterials({
  slug,
  registrationStatus,
  canAccessContent = false,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const allowed = canAccessContent || registrationStatus === "CONFIRMED";

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/me/conferences/${slug}/content`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load materials.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load materials.");
    } finally {
      setLoading(false);
    }
  }, [slug, allowed]);

  useEffect(() => {
    load();
  }, [load]);

  if (!allowed) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Conference materials are available after your registration is approved.
      </p>
    );
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading materials…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;

  const byKey = {
    materials: data?.materials ?? [],
    paperTemplates: data?.paperTemplates ?? [],
    presentationTemplates: data?.presentationTemplates ?? [],
    presentations: data?.presentations ?? [],
  };

  const visibleSections = MEMBER_CONTENT_SECTIONS.filter(
    (section) => (byKey[section.key] ?? []).length > 0,
  );

  if (visibleSections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No materials have been published for this conference yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visibleSections.map((section, index) => {
        const items = byKey[section.key] ?? [];
        return (
          <MemberContentSection
            key={section.key}
            title={section.title}
            description={section.description}
            count={items.length}
            defaultOpen={index === 0}
          >
            {section.key === "presentations" ? (
              <PresentationsBrowser presentations={items} />
            ) : (
              <ResourceFileList items={items} />
            )}
          </MemberContentSection>
        );
      })}
    </div>
  );
}

/**
 * @deprecated Presentations are shown under Materials → Speakers & presentations.
 * @param {{ slug: string; registrationStatus: string | null; canAccessContent?: boolean }} props
 */
export function ConferenceMemberPresentations(props) {
  return <ConferenceMemberMaterials {...props} />;
}
