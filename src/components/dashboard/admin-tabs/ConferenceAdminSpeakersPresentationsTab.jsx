"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { FormSection } from "@/components/forms/FormLayout";
import { cn } from "@/lib/cn";
import { SPEAKER_TYPE_LABELS } from "@/lib/conferences/constants";
import { createSpeakerId } from "@/lib/conferences/utils";
import {
  formatPresentationSpeaker,
  groupPresentationsByDay,
} from "@/lib/conference-content/presentation-days";

const emptyPresForm = {
  title: "",
  dayDate: "",
  speakerId: "",
  speakerName: "",
  speakerTitle: "",
  description: "",
  file: null,
};

/**
 * @param {{ conferenceId: string; nested?: boolean }} props
 */
export function ConferenceAdminSpeakersPresentationsTab({ conferenceId, nested = false }) {
  const [speakers, setSpeakers] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [conferenceDays, setConferenceDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({});
  const [presentationToRemove, setPresentationToRemove] = useState(null);
  const [presForm, setPresForm] = useState(emptyPresForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [spRes, prRes] = await Promise.all([
        fetch(`/api/admin/conferences/${conferenceId}/speakers`),
        fetch(`/api/admin/conferences/${conferenceId}/presentations`),
      ]);
      const spData = await spRes.json();
      const prData = await prRes.json();
      if (!spRes.ok) throw new Error(spData.error || "Could not load speakers.");
      if (!prRes.ok) throw new Error(prData.error || "Could not load presentations.");
      setSpeakers(spData.speakers ?? []);
      setPresentations(prData.presentations ?? []);
      setConferenceDays(prData.conferenceDays ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  const savedSpeakers = useMemo(
    () => (speakers || []).filter((s) => String(s.name || "").trim()),
    [speakers],
  );

  const groupedPresentations = useMemo(() => {
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
    return groupPresentationsByDay(filtered, conferenceDays);
  }, [presentations, search, conferenceDays]);

  function toggleGroup(key) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function addSpeakerRow() {
    setSpeakers((prev) => [
      ...prev,
      {
        id: createSpeakerId(),
        name: "",
        title: "",
        speakerType: "normal",
        photo: "",
        bio: "",
        scheduleMode: "all",
        dates: [],
      },
    ]);
  }

  function updateSpeaker(index, field, value) {
    setSpeakers((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }

  function removeSpeaker(index) {
    setSpeakers((prev) => prev.filter((_, i) => i !== index));
  }

  function onSpeakerSelect(speakerId) {
    if (!speakerId) {
      setPresForm((p) => ({
        ...p,
        speakerId: "",
        speakerName: "",
        speakerTitle: "",
      }));
      return;
    }
    const speaker = savedSpeakers.find((s) => s.id === speakerId);
    if (!speaker) return;
    setPresForm((p) => ({
      ...p,
      speakerId,
      speakerName: String(speaker.name || "").trim(),
      speakerTitle: String(speaker.title || "").trim(),
    }));
  }

  function onCustomSpeakerName(name) {
    const trimmed = name;
    const match = savedSpeakers.find(
      (s) => String(s.name || "").trim().toLowerCase() === trimmed.trim().toLowerCase(),
    );
    setPresForm((p) => ({
      ...p,
      speakerId: match?.id || "",
      speakerName: trimmed,
      speakerTitle: match ? String(match.title || "").trim() : "",
    }));
  }

  async function saveSpeakers() {
    const valid = speakers.filter((s) => s.name?.trim());
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/speakers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speakers: valid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save speakers.");
      setSpeakers(data.speakers ?? []);
      toast.success("Speakers saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save speakers.");
    } finally {
      setBusy(false);
    }
  }

  async function addPresentation(e) {
    e.preventDefault();
    if (!presForm.dayDate) {
      toast.error("Select a conference day.");
      return;
    }
    if (!presForm.title.trim()) {
      toast.error("Presentation title is required.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("title", presForm.title.trim());
      body.append("sessionLabel", presForm.dayDate);
      body.append("speakerName", presForm.speakerName.trim());
      body.append("speakerTitle", presForm.speakerTitle.trim());
      body.append("description", presForm.description);
      if (presForm.file) body.append("file", presForm.file);
      const res = await fetch(`/api/admin/conferences/${conferenceId}/presentations`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add presentation.");
      toast.success("Presentation added.");
      setPresForm(emptyPresForm);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add presentation.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemovePresentation() {
    if (!presentationToRemove) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/presentations?presentationId=${presentationToRemove.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete.");
      toast.success("Removed.");
      setPresentationToRemove(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const Block = nested ? "div" : FormSection;
  const speakersBlockProps = nested
    ? { className: "space-y-4" }
    : {
        title: "Speakers",
        description: "Speaker profiles shown on the public programme. Save after editing.",
      };
  const presBlockProps = nested
    ? { className: "space-y-4" }
    : {
        title: "Conference presentations",
        description:
          "Slides and materials from sessions. Grouped by conference day for approved members.",
      };

  const usingExistingSpeaker = Boolean(presForm.speakerId);
  const speakerDisplay = formatPresentationSpeaker(presForm.speakerName, presForm.speakerTitle);

  return (
    <div className={nested ? "space-y-6" : "space-y-8"}>
      <Block {...speakersBlockProps}>
        {nested ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Speakers
          </p>
        ) : null}
        <div className="space-y-4">
          {speakers.map((speaker, index) => (
            <div
              key={speaker.id || index}
              className="space-y-3 rounded-md border border-border p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Name"
                  requiredMark
                  value={speaker.name}
                  onChange={(e) => updateSpeaker(index, "name", e.target.value)}
                />
                <Input
                  label="Title / role"
                  value={speaker.title ?? ""}
                  onChange={(e) => updateSpeaker(index, "title", e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Type
                  </label>
                  <select
                    value={speaker.speakerType ?? "normal"}
                    onChange={(e) => updateSpeaker(index, "speakerType", e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                  >
                    {Object.entries(SPEAKER_TYPE_LABELS).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Photo URL"
                  hint="Optional"
                  value={speaker.photo ?? ""}
                  onChange={(e) => updateSpeaker(index, "photo", e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSpeaker(index)}
              >
                <Icon icon={Trash2} size="sm" className="text-error" />
                Remove speaker
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addSpeakerRow}>
              <Icon icon={Plus} size="sm" />
              Add speaker
            </Button>
            <Button type="button" variant="primary" disabled={busy} onClick={saveSpeakers}>
              Save speakers
            </Button>
          </div>
        </div>
      </Block>

      <Block {...presBlockProps}>
        {nested ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Session presentations
          </p>
        ) : null}

        {conferenceDays.length === 0 ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Add conference days in the conference schedule first. Presentations are grouped by
            those days (Day 1, Day 2, …).
          </p>
        ) : null}

        <form onSubmit={addPresentation} className="mb-6 space-y-3 rounded-md border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Presentation title"
              requiredMark
              value={presForm.title}
              onChange={(e) => setPresForm((p) => ({ ...p, title: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Day <span className="text-error">*</span>
              </label>
              <select
                required
                value={presForm.dayDate}
                onChange={(e) => setPresForm((p) => ({ ...p, dayDate: e.target.value }))}
                disabled={conferenceDays.length === 0}
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm disabled:opacity-60"
              >
                <option value="">Select day…</option>
                {conferenceDays.map((day) => (
                  <option key={day.date} value={day.date}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Speaker
              </label>
              <select
                value={presForm.speakerId}
                onChange={(e) => onSpeakerSelect(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
              >
                <option value="">Type a name or pick a speaker…</option>
                {savedSpeakers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatPresentationSpeaker(s.name, s.title) || s.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Choosing a speaker uses their name and title together.
              </p>
            </div>
            <div>
              {usingExistingSpeaker ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Speaker (from list)
                  </label>
                  <p className="flex h-10 items-center rounded-md border border-border bg-neutral-50 px-3 text-sm text-foreground">
                    {speakerDisplay || "—"}
                  </p>
                </div>
              ) : (
                <Input
                  label="Speaker name"
                  hint="Type a custom name if not in the list"
                  value={presForm.speakerName}
                  list="presentation-speaker-suggestions"
                  onChange={(e) => onCustomSpeakerName(e.target.value)}
                />
              )}
              <datalist id="presentation-speaker-suggestions">
                {savedSpeakers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              rows={3}
              value={presForm.description}
              onChange={(e) => setPresForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Optional short description"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Slides / file
            </label>
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
              onChange={(e) =>
                setPresForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))
              }
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || conferenceDays.length === 0}
          >
            <Icon icon={Upload} size="sm" />
            Add presentation
          </Button>
        </form>

        <Input
          label="Search presentations"
          hint="Filter by title, speaker, or day"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {groupedPresentations.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No presentations yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {groupedPresentations.map(([group, items]) => {
              const isOpen = openGroups[group] !== false;
              return (
                <div key={group} className="rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
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
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                        >
                          <div className="min-w-0">
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
                          <div className="flex gap-2">
                            {p.downloadUrl ? (
                              <Button
                                variant="outline"
                                size="sm"
                                href={p.downloadUrl}
                                target="_blank"
                              >
                                Open
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                setPresentationToRemove({ id: p.id, title: p.title })
                              }
                            >
                              <Icon icon={Trash2} size="sm" className="text-error" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Block>

      <ConfirmModal
        open={Boolean(presentationToRemove)}
        onClose={() => !busy && setPresentationToRemove(null)}
        onConfirm={confirmRemovePresentation}
        title="Remove presentation"
        message={
          presentationToRemove
            ? `Remove “${presentationToRemove.title}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Remove"
        variant="danger"
        loading={busy}
      />
    </div>
  );
}
