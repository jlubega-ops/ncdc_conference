"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { FormSection } from "@/components/forms/FormLayout";
import { RESOURCE_TYPE_LABELS } from "@/lib/conference-content/constants";

/**
 * @param {{ conferenceId: string; type: string; title: string; emptyHint: string; nested?: boolean }} props
 */
export function ConferenceAdminResourcesTab({
  conferenceId,
  type,
  title,
  emptyHint,
  nested = false,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", file: null });
  const [removeTarget, setRemoveTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/resources?type=${type}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load items.");
      setItems(data.resources ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load items.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [conferenceId, type]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.file) {
      toast.error("Choose a file to upload.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("title", form.title);
      body.append("description", form.description);
      body.append("file", form.file);
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/resources?type=${type}`,
        { method: "POST", body },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not upload.");
      toast.success(`${RESOURCE_TYPE_LABELS[type] ?? "File"} added.`);
      setForm({ title: "", description: "", file: null });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/resources?resourceId=${removeTarget.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete.");
      toast.success("Removed.");
      setRemoveTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  const Section = nested ? "div" : FormSection;
  const sectionProps = nested
    ? { className: "space-y-4" }
    : { title: `Add ${title.toLowerCase()}` };

  const listSectionProps = nested
    ? { className: "space-y-4" }
    : { title: `Uploaded ${title.toLowerCase()}` };

  return (
    <div className={nested ? "space-y-5" : "space-y-6"}>
      <Section {...sectionProps}>
        {nested ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Add file
          </p>
        ) : null}
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Title"
            requiredMark
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <Input
            label="Description"
            hint="Optional"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              File *
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt"
              onChange={(e) =>
                setForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))
              }
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">PDF, Office docs, or images. Max 15MB.</p>
          </div>
          <Button type="submit" variant="primary" disabled={busy}>
            <Icon icon={Upload} size="sm" />
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </form>
      </Section>

      <Section {...listSectionProps}>
        {nested ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Uploaded files
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                  {item.fileName ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.fileName}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" href={item.downloadUrl} target="_blank">
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setRemoveTarget({ id: item.id, title: item.title })}
                    aria-label="Remove"
                  >
                    <Icon icon={Trash2} size="sm" className="text-error" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <ConfirmModal
        open={Boolean(removeTarget)}
        onClose={() => !busy && setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title="Remove file"
        message={
          removeTarget
            ? `Remove “${removeTarget.title}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Remove"
        variant="danger"
        loading={busy}
      />
    </div>
  );
}
