"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatProgrammeDayLabel } from "@/lib/conferences/utils";
import {
  LIKERT_OPTIONS,
  getFeedbackQuestions,
  normalizeFeedbackSettings,
  speakerFeedbackTargetKey,
} from "@/lib/feedback/questions";

function feedbackKey(feedbackType, targetKey) {
  return `${feedbackType}:${targetKey}`;
}

/**
 * Horizontal likert radios — clicking the text selects the option.
 * @param {{
 *   value: number;
 *   onChange: (value: number) => void;
 *   name: string;
 *   disabled?: boolean;
 * }} props
 */
function LikertScale({ value, onChange, name, disabled = false }) {
  return (
    <div
      className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2"
      role="radiogroup"
      aria-label={name}
      aria-disabled={disabled}
    >
      {LIKERT_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "inline-flex w-full cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm text-foreground transition-colors sm:w-auto",
              selected
                ? "border-primary bg-primary-light text-primary"
                : "border-border bg-background hover:border-primary/40",
              disabled && "cursor-not-allowed opacity-60 hover:border-border",
            )}
          >
            <input
              type="radio"
              name={name}
              className="h-4 w-4 shrink-0 accent-[var(--color-primary,#008e51)]"
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
            />
            <span className="font-semibold tabular-nums">{opt.value}</span>
            <span className="leading-none">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * @param {{ conference: { slug: string; feedbackSettings?: any } }} props
 */
export function ConferenceFeedbackTab({ conference }) {
  const slug = conference.slug;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayForm, setDayForm] = useState({});
  const [speakerForms, setSpeakerForms] = useState({});
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKeys, setSavedKeys] = useState({});

  const settings = useMemo(
    () => normalizeFeedbackSettings(data?.settings ?? conference.feedbackSettings),
    [data?.settings, conference.feedbackSettings],
  );
  const dayQuestions = useMemo(() => getFeedbackQuestions("DAY", settings), [settings]);
  const speakerQuestions = useMemo(
    () => getFeedbackQuestions("SPEAKER", settings),
    [settings],
  );

  const todayKey = data?.todayKey ?? null;
  const currentMeetingDay = useMemo(() => {
    const days = data?.days ?? [];
    return days.find((d) => d.date === todayKey) ?? null;
  }, [data?.days, todayKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/me/conferences/${slug}/feedback`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load feedback.");
      setData(json);
      setIsAnonymous(Boolean(json.isAnonymous));

      const days = json.days ?? [];
      const today = json.todayKey;
      const preferred =
        (today && days.find((d) => d.date === today)?.date) ||
        days.find((d) => d.date <= today)?.date ||
        days[0]?.date ||
        null;

      setSelectedDate((prev) =>
        prev && days.some((d) => d.date === prev) ? prev : preferred,
      );

      const feedbackMap = {};
      for (const f of json.feedback ?? []) {
        feedbackMap[feedbackKey(f.feedbackType, f.targetKey)] = f;
      }

      const nextDayForm = {};
      const nextSpeakerForm = {};
      const confSettings = normalizeFeedbackSettings(json.settings);
      const dayQs = getFeedbackQuestions("DAY", confSettings);
      const speakerQs = getFeedbackQuestions("SPEAKER", confSettings);

      for (const day of days) {
        const existing = feedbackMap[feedbackKey("DAY", day.date)];
        const dayValues = { comment: existing?.comment ?? "" };
        for (const q of dayQs.ratings) {
          dayValues[q.key] = existing?.answers?.[q.key] ?? 0;
        }
        nextDayForm[day.date] = dayValues;

        for (const speaker of day.speakers ?? []) {
          const target = speakerFeedbackTargetKey(day.date, speaker.id);
          const sExisting =
            feedbackMap[feedbackKey("SPEAKER", target)] ||
            feedbackMap[feedbackKey("SPEAKER", speaker.id)];
          const sValues = { comment: sExisting?.comment ?? "" };
          for (const q of speakerQs.ratings) {
            sValues[q.key] = sExisting?.answers?.[q.key] ?? 0;
          }
          nextSpeakerForm[target] = sValues;
        }
      }
      setDayForm(nextDayForm);
      setSpeakerForms(nextSpeakerForm);
      setSavedKeys(Object.fromEntries(Object.keys(feedbackMap).map((k) => [k, true])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load feedback.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitFeedback(feedbackType, targetKey, answers, comment) {
    const key = feedbackKey(feedbackType, targetKey);
    setSavingKey(key);
    try {
      const res = await fetch(`/api/me/conferences/${slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackType,
          targetKey,
          answers,
          comment,
          isAnonymous,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save feedback.");
      toast.success("Thanks for your feedback!");
      setSavedKeys((prev) => ({ ...prev, [key]: true }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save feedback.");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading feedback…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;

  const days = data?.days ?? [];
  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Feedback opens once the conference days begin.
      </p>
    );
  }

  const activeDay = days.find((d) => d.date === selectedDate) ?? days[0];
  const dayStatus =
    activeDay.date === todayKey ? "today" : activeDay.date < todayKey ? "past" : "future";
  const canEdit = dayStatus === "today";
  const dayValues = dayForm[activeDay.date] ?? { comment: "" };
  const dayKey = feedbackKey("DAY", activeDay.date);
  const dayReady = dayQuestions.ratings.every((q) => (dayValues[q.key] ?? 0) > 0);

  return (
    <div className="space-y-6">
      {currentMeetingDay ? (
        <div className="rounded-lg border border-primary/30 bg-primary-light px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Current meeting day
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            Day {currentMeetingDay.dayIndex} — {formatProgrammeDayLabel(currentMeetingDay.date)}
          </p>
          <p className="mt-1 text-sm text-foreground/80">
            You can only submit or edit feedback for today. Past days are locked; future days open
            on their date.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-neutral-50 px-4 py-3 text-sm text-foreground/80">
          There is no conference day scheduled for today ({todayKey}). You can review past feedback,
          but new submissions open on a scheduled meeting day.
        </div>
      )}

      <label className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          disabled={!canEdit}
        />
        <span>
          <span className="block text-sm font-medium text-foreground">Submit as anonymous</span>
          <span className="mt-0.5 block text-sm text-foreground/80">
            Applies to all days. When on, your name and email are hidden from organisers on the
            feedback report.
          </span>
        </span>
      </label>

      <div>
        <h2 className="text-sm font-semibold text-foreground">Select a day</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {days.map((day) => {
            const isToday = day.date === todayKey;
            const isPast = todayKey ? day.date < todayKey : false;
            const isFuture = todayKey ? day.date > todayKey : false;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                  day.date === activeDay.date
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40",
                )}
              >
                Day {day.dayIndex}
                {isToday ? (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      day.date === activeDay.date
                        ? "bg-white/20 text-primary-foreground"
                        : "bg-primary-light text-primary",
                    )}
                  >
                    Today
                  </span>
                ) : null}
                {isPast || isFuture ? <Icon icon={Lock} size="sm" /> : null}
                {savedKeys[feedbackKey("DAY", day.date)] ? (
                  <Icon icon={CheckCircle2} size="sm" />
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-foreground/80">
          {formatProgrammeDayLabel(activeDay.date)}
          {dayStatus === "today"
            ? " · Open for feedback"
            : dayStatus === "past"
              ? " · Locked (past day)"
              : " · Not open yet"}
        </p>
      </div>

      {!canEdit ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {dayStatus === "past"
            ? "Feedback for this day is locked and can no longer be edited."
            : "Feedback for this day opens on the meeting date. You cannot submit tomorrow’s feedback today."}
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground">Day feedback</h3>
        <div className="mt-4 space-y-5">
          {dayQuestions.ratings.map((q) => (
            <div key={q.key}>
              <p className="mb-2 text-sm font-medium text-foreground">{q.label}</p>
              <LikertScale
                name={`day-${activeDay.date}-${q.key}`}
                value={dayValues[q.key] ?? 0}
                disabled={!canEdit}
                onChange={(v) =>
                  setDayForm((prev) => ({
                    ...prev,
                    [activeDay.date]: { ...prev[activeDay.date], [q.key]: v },
                  }))
                }
              />
            </div>
          ))}

          {activeDay.speakers?.length > 0 ? (
            <div className="space-y-4 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground">Speakers for this day</h4>
              {activeDay.speakers.map((speaker) => {
                const target = speakerFeedbackTargetKey(activeDay.date, speaker.id);
                const sValues = speakerForms[target] ?? { comment: "" };
                const fKey = feedbackKey("SPEAKER", target);
                const ready = speakerQuestions.ratings.every((q) => (sValues[q.key] ?? 0) > 0);
                const saved = Boolean(
                  savedKeys[fKey] || savedKeys[feedbackKey("SPEAKER", speaker.id)],
                );

                return (
                  <div
                    key={speaker.id}
                    className="rounded-md border border-border bg-background p-4"
                  >
                    <p className="text-sm font-medium text-foreground">{speaker.name}</p>
                    {speaker.title ? (
                      <p className="text-xs text-muted-foreground">{speaker.title}</p>
                    ) : null}
                    <div className="mt-3 space-y-4">
                      {speakerQuestions.ratings.map((q) => (
                        <div key={q.key}>
                          <p className="mb-2 text-sm text-foreground">{q.label}</p>
                          <LikertScale
                            name={`speaker-${target}-${q.key}`}
                            value={sValues[q.key] ?? 0}
                            disabled={!canEdit}
                            onChange={(v) =>
                              setSpeakerForms((prev) => ({
                                ...prev,
                                [target]: { ...prev[target], [q.key]: v },
                              }))
                            }
                          />
                        </div>
                      ))}
                      <textarea
                        rows={2}
                        maxLength={speakerQuestions.commentMaxLength}
                        value={sValues.comment ?? ""}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setSpeakerForms((prev) => ({
                            ...prev,
                            [target]: { ...prev[target], comment: e.target.value },
                          }))
                        }
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
                        placeholder={speakerQuestions.commentLabel}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canEdit || !ready || savingKey === fKey}
                        onClick={() => {
                          const answers = {};
                          for (const q of speakerQuestions.ratings) {
                            answers[q.key] = sValues[q.key];
                          }
                          submitFeedback("SPEAKER", target, answers, sValues.comment);
                        }}
                      >
                        {savingKey === fKey
                          ? "Saving…"
                          : saved
                            ? "Update speaker rating"
                            : "Save speaker rating"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : settings.evaluateSpeakers !== false ? (
            <p className="border-t border-border pt-4 text-sm text-foreground/80">
              No speakers are scheduled for this day yet. Speakers added on the conference Speakers
              tab (for this date or all days) will appear here for evaluation.
            </p>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm text-foreground">
              {dayQuestions.commentLabel}
            </label>
            <textarea
              rows={2}
              maxLength={dayQuestions.commentMaxLength}
              value={dayValues.comment ?? ""}
              disabled={!canEdit}
              onChange={(e) =>
                setDayForm((prev) => ({
                  ...prev,
                  [activeDay.date]: { ...prev[activeDay.date], comment: e.target.value },
                }))
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
              placeholder="Optional"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={!canEdit || !dayReady || savingKey === dayKey}
            onClick={() => {
              const answers = {};
              for (const q of dayQuestions.ratings) {
                answers[q.key] = dayValues[q.key];
              }
              submitFeedback("DAY", activeDay.date, answers, dayValues.comment);
            }}
          >
            {savingKey === dayKey
              ? "Saving…"
              : savedKeys[dayKey]
                ? "Update day feedback"
                : "Submit day feedback"}
          </Button>
        </div>
      </section>
    </div>
  );
}
