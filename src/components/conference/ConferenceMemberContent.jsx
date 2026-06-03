"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * @param {{ slug: string; registrationStatus: string | null }} props
 */
export function ConferenceMemberMaterials({ slug, registrationStatus }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (registrationStatus !== "CONFIRMED") {
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
  }, [slug, registrationStatus]);

  useEffect(() => {
    load();
  }, [load]);

  if (registrationStatus !== "CONFIRMED") {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Conference materials are available after your registration is approved.
      </p>
    );
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading materials…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;

  const sections = [
    { key: "materials", title: "Materials", items: data?.materials ?? [] },
    { key: "paperTemplates", title: "Paper templates", items: data?.paperTemplates ?? [] },
    {
      key: "presentationTemplates",
      title: "Presentation templates",
      items: data?.presentationTemplates ?? [],
    },
  ];

  const hasAny = sections.some((s) => s.items.length > 0);
  if (!hasAny) {
    return (
      <p className="text-sm text-muted-foreground">
        No materials have been published for this conference yet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) =>
        section.items.length > 0 ? (
          <section key={section.key}>
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            <ul className="mt-3 divide-y divide-border rounded-md border border-border">
              {section.items.map((item) => (
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
          </section>
        ) : null,
      )}
    </div>
  );
}

/**
 * @param {{ slug: string; registrationStatus: string | null }} props
 */
export function ConferenceMemberPresentations({ slug, registrationStatus }) {
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    if (registrationStatus !== "CONFIRMED") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/me/conferences/${slug}/content`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load presentations.");
        if (!cancelled) setPresentations(json.presentations ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load presentations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, registrationStatus]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = presentations.filter((p) => {
      if (!q) return true;
      return (
        p.title?.toLowerCase().includes(q) ||
        p.speakerName?.toLowerCase().includes(q) ||
        p.sessionLabel?.toLowerCase().includes(q)
      );
    });
    const map = new Map();
    for (const p of filtered) {
      const key = p.sessionLabel?.trim() || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [presentations, search]);

  if (registrationStatus !== "CONFIRMED") {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Session presentations are available after your registration is approved.
      </p>
    );
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading presentations…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;

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
          placeholder="Search by title, speaker, or session…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm"
        />
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {presentations.length === 0
            ? "No presentations have been published yet."
            : "No presentations match your search."}
        </p>
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
                              {p.speakerName}
                              {p.speakerTitle ? ` · ${p.speakerTitle}` : ""}
                            </p>
                          ) : null}
                          {p.description ? (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
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
      <p className="text-xs text-muted-foreground">
        {presentations.length} presentation{presentations.length === 1 ? "" : "s"} — expand a
        session to browse.
      </p>
    </div>
  );
}
