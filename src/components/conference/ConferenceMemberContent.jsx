"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, Download, Eye, FileText, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { MEMBER_CONTENT_SECTIONS } from "@/lib/conference-content/constants";
import {
  formatPresentationSpeaker,
  groupPresentationsByDay,
} from "@/lib/conference-content/presentation-days";

/**
 * @param {string | null | undefined} fileName
 */
function canPreviewFile(fileName) {
  const name = String(fileName || "").toLowerCase();
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif")
  );
}

/**
 * @param {string | null | undefined} fileName
 */
function isImageFile(fileName) {
  const name = String(fileName || "").toLowerCase();
  return (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif")
  );
}

/**
 * Fetch a protected member file as a blob URL (requires session cookies).
 * @param {string} url
 */
async function fetchProtectedBlob(url) {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) {
    let message = "Could not open file.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

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
 * @param {{
 *   slug: string;
 *   kind: "resource" | "presentation";
 *   items: Array<{
 *     id: string;
 *     title: string;
 *     author?: string | null;
 *     description?: string | null;
 *     fileName?: string | null;
 *     speakerName?: string | null;
 *     speakerTitle?: string | null;
 *     hasFile?: boolean;
 *   }>;
 * }} props
 */
function ProtectedResourceActions({ slug, kind, item }) {
  const [busy, setBusy] = useState("");
  const [preview, setPreview] = useState(null);

  const fileUrl = (mode) =>
    `/api/me/conferences/${encodeURIComponent(slug)}/files/${kind}/${encodeURIComponent(item.id)}?mode=${mode}`;

  async function handlePreview() {
    if (!canPreviewFile(item.fileName)) {
      toast.info("Preview is available for PDF and image files. Please download this file.");
      return;
    }
    setBusy("preview");
    try {
      const blobUrl = await fetchProtectedBlob(fileUrl("preview"));
      setPreview({
        url: blobUrl,
        title: item.title,
        isImage: isImageFile(item.fileName),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not preview file.");
    } finally {
      setBusy("");
    }
  }

  async function handleDownload() {
    setBusy("download");
    try {
      const blobUrl = await fetchProtectedBlob(fileUrl("download"));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = item.fileName || item.title || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
      toast.success("Download started.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download file.");
    } finally {
      setBusy("");
    }
  }

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={Boolean(busy)}
          onClick={handlePreview}
        >
          <Icon icon={Eye} size="sm" />
          {busy === "preview" ? "Opening…" : "Preview"}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={Boolean(busy)}
          onClick={handleDownload}
        >
          <Icon icon={Download} size="sm" />
          {busy === "download" ? "…" : "Download"}
        </Button>
      </div>

      <Modal open={Boolean(preview)} onClose={closePreview} title={preview?.title || "Preview"}>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-md border border-border bg-neutral-50">
            {preview?.isImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob preview URL
              <img
                src={preview.url}
                alt={preview.title}
                className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
              />
            ) : preview ? (
              <iframe
                title={preview.title}
                src={preview.url}
                className="h-[70vh] w-full"
              />
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closePreview}>
              <Icon icon={X} size="sm" />
              Close
            </Button>
            <Button variant="primary" onClick={handleDownload} disabled={Boolean(busy)}>
              <Icon icon={Download} size="sm" />
              Download
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/**
 * @param {{
 *   slug: string;
 *   items: Array<{ id: string; title: string; author?: string | null; description?: string | null; fileName?: string | null }>;
 * }} props
 */
function ResourceFileList({ slug, items }) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            {item.author ? (
              <p className="mt-0.5 text-xs text-muted-foreground">Author: {item.author}</p>
            ) : null}
            {item.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            ) : null}
          </div>
          <ProtectedResourceActions slug={slug} kind="resource" item={item} />
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {{ slug: string; presentations: any[] }} props
 */
function PresentationsBrowser({ slug, presentations }) {
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
                      <li key={p.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
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
                        {p.hasFile ? (
                          <ProtectedResourceActions slug={slug} kind="presentation" item={p} />
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
      const res = await fetch(`/api/me/conferences/${slug}/content`, {
        cache: "no-store",
        credentials: "same-origin",
      });
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
              <PresentationsBrowser slug={slug} presentations={items} />
            ) : (
              <ResourceFileList slug={slug} items={items} />
            )}
          </MemberContentSection>
        );
      })}
    </div>
  );
}
