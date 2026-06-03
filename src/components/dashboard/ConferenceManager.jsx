"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Save,
  Pencil,
  Trash2,
  Upload,
  X,
  Calendar,
  MapPin,
  Search,
  CircleDot,
  Eye,
} from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ConferenceImage } from "@/components/ConferenceImage";
import {
  CATEGORIES,
  DEFAULT_PAID_VISIBILITY,
  FORM_SECTIONS,
  PAID_VISIBILITY_OPTIONS,
  PAYMENT_DETAIL_FIELDS,
  PUBLICATION_LABELS,
  SPEAKER_TYPES,
  SPEAKER_TYPE_LABELS,
  STATUS_LABELS,
} from "@/lib/conferences/constants";
import { cascadeConferenceScheduleData } from "@/lib/conferences/cascade";
import { validateConferenceForm } from "@/lib/conferences/validation";
import { normalizePaidContentVisibility } from "@/lib/conferences/visibility";
import {
  createFaqId,
  createSpeakerId,
  emptyContacts,
  emptyOnlineStream,
  emptyPaymentDetails,
  formatProgrammeDayLabel,
  formatProgrammeTimeSlot,
  isRichTextEmpty,
  normalizeContacts,
  normalizeFaq,
  normalizeOnlineStream,
  normalizePaymentDetails,
  normalizeSpeaker,
} from "@/lib/conferences/utils";
import { FieldLabel } from "@/components/ui/FieldLabel";

function emptyConference() {
  return {
    id: null,
    slug: "",
    title: "",
    description: "",
    theme: "",
    subThemes: [],
    startDate: "",
    endDate: "",
    timezone: "Africa/Nairobi",
    location: "",
    venue: "",
    category: CATEGORIES[0],
    publicationStatus: "DRAFT",
    featured: false,
    cardImage: "/assets/ncdc_image.jpg",
    cfpOpenAt: "",
    cfpCloseAt: "",
    registrationOpenAt: "",
    registrationCloseAt: "",
    conferenceDays: [{ date: "", startTime: "09:00", endTime: "17:00" }],
    cfpTopics: [],
    submissionGuidelines: "",
    programme: [],
    speakers: [],
    faqs: [],
    requiresPayment: false,
    paymentDetails: emptyPaymentDetails(),
    paidContentVisibility: { ...DEFAULT_PAID_VISIBILITY },
    onlineStream: emptyOnlineStream(),
    contacts: emptyContacts(),
  };
}

function paymentFieldKey(field) {
  return `paymentDetails.${field}`;
}

function mapConferenceFormExtras(conf) {
  return {
    requiresPayment: Boolean(conf.requiresPayment),
    paymentDetails: normalizePaymentDetails(conf.paymentDetails),
    paidContentVisibility: normalizePaidContentVisibility(conf.paidContentVisibility),
    onlineStream: normalizeOnlineStream(conf.onlineStream),
    contacts: normalizeContacts(conf.contacts),
  };
}

function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function deriveDateRangeFromConferenceDays(days) {
  const validDays = (Array.isArray(days) ? days : [])
    .filter((day) => day?.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (validDays.length === 0) {
    return { startDate: null, endDate: null };
  }
  return {
    startDate: validDays[0].date,
    endDate: validDays[validDays.length - 1].date,
  };
}

function toMinutes(value) {
  if (!value || typeof value !== "string" || !value.includes(":")) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function isProgrammeWithinDay(entry, day) {
  const dayStart = toMinutes(day?.startTime);
  const dayEnd = toMinutes(day?.endTime);
  const start = toMinutes(entry?.startTime);
  const end = toMinutes(entry?.endTime);
  if (dayStart === null || dayEnd === null || start === null || end === null) return false;
  return start >= dayStart && end <= dayEnd;
}

function hasProgrammeOverlap(programmes, nextEntry) {
  const nextStart = toMinutes(nextEntry.startTime);
  const nextEnd = toMinutes(nextEntry.endTime);
  if (nextStart === null || nextEnd === null) return false;
  return programmes.some((item) => {
    if (item?.date !== nextEntry.date) return false;
    const itemStart = toMinutes(item.startTime);
    const itemEnd = toMinutes(item.endTime);
    if (itemStart === null || itemEnd === null) return false;
    return nextStart < itemEnd && nextEnd > itemStart;
  });
}

function normalizeForSubmit(form, publicationStatusOverride) {
  const publicationStatus = publicationStatusOverride || form.publicationStatus || "DRAFT";
  const conferenceDays = Array.isArray(form.conferenceDays)
    ? form.conferenceDays.filter((day) => day?.date)
    : [];
  const cascaded = cascadeConferenceScheduleData({
    conferenceDays,
    programme: form.programme,
    speakers: form.speakers,
  });
  const description = (form.description ?? "").trim();
  return {
    ...form,
    publicationStatus,
    description,
    shortDescription: description.replace(/\s+/g, " ").slice(0, 200) || null,
    ...deriveDateRangeFromConferenceDays(conferenceDays),
    timezone: form.timezone || "Africa/Nairobi",
    cfpOpenAt: form.cfpOpenAt || null,
    cfpCloseAt: form.cfpCloseAt || null,
    registrationOpenAt: form.registrationOpenAt || null,
    registrationCloseAt: form.registrationCloseAt || null,
    conferenceDays,
    programme: cascaded.programme,
    speakers: cascaded.speakers,
    requiresPayment: Boolean(form.requiresPayment),
    paymentDetails: form.requiresPayment
      ? normalizePaymentDetails(form.paymentDetails)
      : null,
    paidContentVisibility: form.requiresPayment
      ? normalizePaidContentVisibility(form.paidContentVisibility)
      : null,
    onlineStream: normalizeOnlineStream(form.onlineStream),
    contacts: normalizeContacts(form.contacts),
  };
}

function getDraftStorageKey(id) {
  return `conference-manager:draft:${id || "new"}`;
}

function programmeFieldKey(date, field) {
  return `programme.${date}.${field}`;
}

function emptySpeakerDraft() {
  return {
    name: "",
    title: "",
    speakerType: "normal",
    photo: "",
    bio: "",
    scheduleMode: "all",
    dates: [],
  };
}

function speakerFieldKey(field) {
  return `speakers.${field}`;
}

function mapSpeakersForForm(speakers) {
  return (Array.isArray(speakers) ? speakers : [])
    .map((item) => normalizeSpeaker(item))
    .filter(Boolean);
}

function emptyFaqDraft() {
  return { question: "", answer: "" };
}

function faqFieldKey(field) {
  return `faqs.${field}`;
}

function mapFaqsForForm(faqs) {
  return (Array.isArray(faqs) ? faqs : [])
    .map((item) => normalizeFaq(item))
    .filter(Boolean);
}

function fieldBelongsToSection(key, sectionId) {
  if (sectionId === "basics") {
    return ["title", "slug", "description", "theme", "category"].includes(key);
  }
  if (sectionId === "schedule") {
    return (
      key.startsWith("conferenceDays") ||
      [
        "location",
        "venue",
        "timezone",
        "cfpOpenAt",
        "cfpCloseAt",
        "registrationOpenAt",
        "registrationCloseAt",
        "conferenceDays",
      ].includes(key) ||
      key.startsWith("onlineStream.")
    );
  }
  if (sectionId === "media") return key === "cardImage";
  if (sectionId === "cfp") return key === "cfpTopics" || key === "submissionGuidelines";
  if (sectionId === "programme") return key.startsWith("programme.");
  if (sectionId === "speakers") return key.startsWith("speakers.");
  if (sectionId === "faqs") return key.startsWith("faqs.");
  if (sectionId === "payments") {
    return (
      key === "requiresPayment" ||
      key.startsWith("paymentDetails.") ||
      key.startsWith("paidContentVisibility.")
    );
  }
  if (sectionId === "contacts") return key.startsWith("contacts.");
  return false;
}

function getSectionErrorMessages(fieldErrors, sectionId) {
  return Object.entries(fieldErrors)
    .filter(([key]) => fieldBelongsToSection(key, sectionId))
    .map(([, message]) => message);
}

function firstSectionWithErrors(fieldErrors) {
  for (const section of FORM_SECTIONS) {
    if (getSectionErrorMessages(fieldErrors, section.id).length > 0) {
      return section.id;
    }
  }
  return null;
}

function sectionHasErrors(fieldErrors, sectionId) {
  return getSectionErrorMessages(fieldErrors, sectionId).length > 0;
}

function SectionErrorAlert({ messages }) {
  if (!messages.length) return null;
  return (
    <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2" role="alert">
      <p className="text-sm font-medium text-error">Please fix the fields highlighted below.</p>
      {messages.length > 1 ? (
        <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-error">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-error">{messages[0]}</p>
      )}
    </div>
  );
}

/**
 * @param {{
 * conferences: Array<any>
 * }} props
 */
export function ConferenceManager({ conferences }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openedEditFromQuery = useRef(false);
  const [list, setList] = useState(conferences);
  const [activeSection, setActiveSection] = useState(FORM_SECTIONS[0].id);
  const [editing, setEditing] = useState(emptyConference());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingCardImage, setUploadingCardImage] = useState(false);
  const [programmeDrafts, setProgrammeDrafts] = useState({});
  const [speakerDraft, setSpeakerDraft] = useState(emptySpeakerDraft);
  const [editingSpeakerId, setEditingSpeakerId] = useState(null);
  const [faqDraft, setFaqDraft] = useState(emptyFaqDraft);
  const [newContactEmail, setNewContactEmail] = useState("");
  const [uploadingSpeakerPhoto, setUploadingSpeakerPhoto] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newSubTheme, setNewSubTheme] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const sorted = useMemo(() => {
    return [...list].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
    );
  }, [list]);

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.trim().toLowerCase();
    return sorted.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q),
    );
  }, [query, sorted]);

  useEffect(() => {
    if (!isFormOpen) return;
    try {
      const payload = JSON.stringify({ editing, activeSection });
      localStorage.setItem(getDraftStorageKey(editing.id), payload);
    } catch {
      // ignore storage errors
    }
  }, [editing, activeSection, isFormOpen]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || openedEditFromQuery.current || list.length === 0) return;
    const conf = list.find((item) => item.id === editId);
    if (!conf) return;
    openedEditFromQuery.current = true;
    setEditing({
      ...emptyConference(),
      ...conf,
      startDate: toInputDate(conf.startDate),
      endDate: toInputDate(conf.endDate),
      cfpOpenAt: toInputDate(conf.cfpOpenAt),
      cfpCloseAt: toInputDate(conf.cfpCloseAt),
      registrationOpenAt: toInputDate(conf.registrationOpenAt),
      registrationCloseAt: toInputDate(conf.registrationCloseAt),
      timezone: conf.timezone || "Africa/Nairobi",
      conferenceDays:
        Array.isArray(conf.conferenceDays) && conf.conferenceDays.length > 0
          ? conf.conferenceDays
          : [{ date: "", startTime: "09:00", endTime: "17:00" }],
      cfpTopics: Array.isArray(conf.cfpTopics) ? conf.cfpTopics : [],
      subThemes: Array.isArray(conf.subThemes) ? conf.subThemes : [],
      programme: Array.isArray(conf.programme) ? conf.programme : [],
      speakers: mapSpeakersForForm(conf.speakers),
      faqs: mapFaqsForForm(conf.faqs),
      ...mapConferenceFormExtras(conf),
    });
    setProgrammeDrafts({});
    setSpeakerDraft(emptySpeakerDraft());
    setEditingSpeakerId(null);
    setFaqDraft(emptyFaqDraft());
    setNewContactEmail("");
    setNewSubTheme("");
    setActiveSection("basics");
    setError("");
    setFieldErrors({});
    setIsFormOpen(true);
    router.replace("/dashboard/manage", { scroll: false });
  }, [searchParams, list, router]);

  function beginCreate() {
    const base = emptyConference();
    try {
      const raw = localStorage.getItem(getDraftStorageKey(null));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.editing && !parsed.editing.id) {
          setEditing({ ...base, ...parsed.editing });
          setActiveSection(parsed.activeSection || "basics");
        } else {
          setEditing(base);
          setActiveSection("basics");
        }
      } else {
        setEditing(base);
        setActiveSection("basics");
      }
    } catch {
      setEditing(base);
      setActiveSection("basics");
    }
    setProgrammeDrafts({});
    setSpeakerDraft(emptySpeakerDraft());
    setEditingSpeakerId(null);
    setFaqDraft(emptyFaqDraft());
    setNewContactEmail("");
    setError("");
    setFieldErrors({});
    setIsFormOpen(true);
  }

  function beginEdit(conf) {
    const baseEditing = {
      ...emptyConference(),
      ...conf,
      startDate: toInputDate(conf.startDate),
      endDate: toInputDate(conf.endDate),
      cfpOpenAt: toInputDate(conf.cfpOpenAt),
      cfpCloseAt: toInputDate(conf.cfpCloseAt),
      registrationOpenAt: toInputDate(conf.registrationOpenAt),
      registrationCloseAt: toInputDate(conf.registrationCloseAt),
      timezone: conf.timezone || "Africa/Nairobi",
      conferenceDays:
        Array.isArray(conf.conferenceDays) && conf.conferenceDays.length > 0
          ? conf.conferenceDays
          : [{ date: "", startTime: "09:00", endTime: "17:00" }],
      cfpTopics: Array.isArray(conf.cfpTopics) ? conf.cfpTopics : [],
      subThemes: Array.isArray(conf.subThemes) ? conf.subThemes : [],
      programme: Array.isArray(conf.programme) ? conf.programme : [],
      speakers: mapSpeakersForForm(conf.speakers),
      faqs: mapFaqsForForm(conf.faqs),
      ...mapConferenceFormExtras(conf),
    };

    try {
      const raw = localStorage.getItem(getDraftStorageKey(conf.id));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.editing?.id === conf.id) {
          setEditing({ ...baseEditing, ...parsed.editing });
          setActiveSection(parsed.activeSection || "basics");
        } else {
          setEditing(baseEditing);
          setActiveSection("basics");
        }
      } else {
        setEditing(baseEditing);
        setActiveSection("basics");
      }
    } catch {
      setEditing(baseEditing);
      setActiveSection("basics");
    }
    setProgrammeDrafts({});
    setSpeakerDraft(emptySpeakerDraft());
    setEditingSpeakerId(null);
    setFaqDraft(emptyFaqDraft());
    setNewContactEmail("");
    setError("");
    setFieldErrors({});
    setIsFormOpen(true);
  }

  function closeForm() {
    if (loading) return;
    setIsFormOpen(false);
    setError("");
    setFieldErrors({});
    setProgrammeDrafts({});
    setSpeakerDraft(emptySpeakerDraft());
    setEditingSpeakerId(null);
    setFaqDraft(emptyFaqDraft());
    setNewContactEmail("");
  }

  function onField(name, value) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setEditing((prev) => ({ ...prev, [name]: value }));
  }

  function addConferenceDay() {
    setEditing((prev) => ({
      ...prev,
      conferenceDays: [
        ...(Array.isArray(prev.conferenceDays) ? prev.conferenceDays : []),
        { date: "", startTime: "09:00", endTime: "17:00" },
      ],
    }));
  }

  function updateConferenceDay(index, key, value) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`conferenceDays.${index}.${key}`];
      delete next.conferenceDays;
      return next;
    });
    setEditing((prev) => {
      const nextDays = Array.isArray(prev.conferenceDays) ? [...prev.conferenceDays] : [];
      nextDays[index] = { ...(nextDays[index] ?? {}), [key]: value };
      return { ...prev, conferenceDays: nextDays };
    });
  }

  function removeConferenceDay(index) {
    setEditing((prev) => {
      const nextDays = Array.isArray(prev.conferenceDays) ? [...prev.conferenceDays] : [];
      const removedDate = nextDays[index]?.date;
      nextDays.splice(index, 1);
      const cascaded = cascadeConferenceScheduleData({
        conferenceDays: nextDays,
        programme: prev.programme,
        speakers: prev.speakers,
      });
      if (removedDate) {
        setProgrammeDrafts((drafts) => {
          const next = { ...drafts };
          delete next[removedDate];
          return next;
        });
      }
      return {
        ...prev,
        conferenceDays: nextDays,
        programme: cascaded.programme,
        speakers: cascaded.speakers,
      };
    });
  }

  function updateProgrammeDraft(date, key, value) {
    const fieldKey = programmeFieldKey(date, key);
    setFieldErrors((prev) => {
      if (!prev[fieldKey] && !prev[programmeFieldKey(date, "_form")]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      delete next[programmeFieldKey(date, "_form")];
      return next;
    });
    setProgrammeDrafts((prev) => ({
      ...prev,
      [date]: {
        title: prev[date]?.title || "",
        startTime: prev[date]?.startTime || "",
        endTime: prev[date]?.endTime || "",
        [key]: value,
      },
    }));
  }

  function addProgrammeEntry(date) {
    const draft = programmeDrafts[date] ?? {};
    const title = (draft.title ?? "").trim();
    const startTime = draft.startTime ?? "";
    const endTime = draft.endTime ?? "";
    const draftErrors = {};

    if (!title) draftErrors[programmeFieldKey(date, "title")] = "Programme item is required.";
    if (!startTime) draftErrors[programmeFieldKey(date, "startTime")] = "Start time is required.";
    if (!endTime) draftErrors[programmeFieldKey(date, "endTime")] = "End time is required.";

    if (startTime && endTime && startTime >= endTime) {
      draftErrors[programmeFieldKey(date, "endTime")] = "End time must be after start time.";
    }

    const day = (editing.conferenceDays || []).find((item) => item.date === date);
    if (
      startTime &&
      endTime &&
      startTime < endTime &&
      (!day || !isProgrammeWithinDay({ startTime, endTime }, day))
    ) {
      draftErrors[programmeFieldKey(date, "startTime")] =
        "Time must be within the conference day window.";
      draftErrors[programmeFieldKey(date, "endTime")] =
        "Time must be within the conference day window.";
    }

    const currentProgrammes = Array.isArray(editing.programme) ? editing.programme : [];
    const nextEntry = { date, title, startTime, endTime };

    if (
      title &&
      startTime &&
      endTime &&
      startTime < endTime &&
      hasProgrammeOverlap(currentProgrammes, nextEntry)
    ) {
      draftErrors[programmeFieldKey(date, "_form")] =
        "Programme times cannot overlap on the same date.";
    }

    if (Object.keys(draftErrors).length > 0) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith(`programme.${date}`)) delete next[key];
        });
        return { ...next, ...draftErrors };
      });
      setActiveSection("programme");
      return;
    }

    const nextProgrammes = [...currentProgrammes, nextEntry].sort((a, b) => {
      if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
      return (toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0);
    });

    onField("programme", nextProgrammes);
    setProgrammeDrafts((prev) => ({
      ...prev,
      [date]: { title: "", startTime: "", endTime: "" },
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`programme.${date}`)) delete next[key];
      });
      return next;
    });
  }

  function removeProgrammeEntry(index) {
    setEditing((prev) => {
      const next = Array.isArray(prev.programme) ? [...prev.programme] : [];
      next.splice(index, 1);
      return { ...prev, programme: next };
    });
  }

  function updateSpeakerDraft(field, value) {
    setSpeakerDraft((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[speakerFieldKey(field)];
      delete next[speakerFieldKey("_form")];
      return next;
    });
  }

  function toggleSpeakerDraftDate(date) {
    setSpeakerDraft((prev) => {
      const dates = prev.dates.includes(date)
        ? prev.dates.filter((d) => d !== date)
        : [...prev.dates, date];
      return { ...prev, scheduleMode: "specific", dates };
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[speakerFieldKey("dates")];
      return next;
    });
  }

  function prepareSpeakerDraftForDate(date) {
    setSpeakerDraft({
      ...emptySpeakerDraft(),
      scheduleMode: "specific",
      dates: [date],
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith("speakers.")) delete next[key];
      });
      return next;
    });
  }

  function saveSpeaker() {
    const draftErrors = {};
    const name = speakerDraft.name?.trim();
    const title = speakerDraft.title?.trim();

    if (!name) draftErrors[speakerFieldKey("name")] = "Speaker name is required.";
    if (!title) draftErrors[speakerFieldKey("title")] = "Speaker title is required.";
    if (
      speakerDraft.scheduleMode === "specific" &&
      (!Array.isArray(speakerDraft.dates) || speakerDraft.dates.length === 0)
    ) {
      draftErrors[speakerFieldKey("dates")] =
        "Select at least one date, or choose all conference dates.";
    }

    if (Object.keys(draftErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...draftErrors }));
      setActiveSection("speakers");
      return;
    }

    const entry = normalizeSpeaker({
      id: editingSpeakerId || createSpeakerId(),
      name,
      title,
      speakerType: speakerDraft.speakerType || "normal",
      photo: speakerDraft.photo || "",
      bio: speakerDraft.bio || "",
      scheduleMode: speakerDraft.scheduleMode,
      dates: speakerDraft.scheduleMode === "all" ? [] : speakerDraft.dates,
    });

    if (!entry) return;

    const current = Array.isArray(editing.speakers) ? editing.speakers : [];
    const nextSpeakers = editingSpeakerId
      ? current.map((speaker) => (speaker.id === editingSpeakerId ? entry : speaker))
      : [...current, entry];

    onField("speakers", nextSpeakers);
    setSpeakerDraft(emptySpeakerDraft());
    setEditingSpeakerId(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith("speakers.")) delete next[key];
      });
      return next;
    });
  }

  function beginEditSpeaker(speaker) {
    setEditingSpeakerId(speaker.id);
    setSpeakerDraft({
      name: speaker.name || "",
      title: speaker.title || "",
      speakerType: speaker.speakerType || "normal",
      photo: speaker.photo || "",
      bio: speaker.bio || "",
      scheduleMode: speaker.scheduleMode || "all",
      dates: Array.isArray(speaker.dates) ? [...speaker.dates] : [],
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith("speakers.")) delete next[key];
      });
      return next;
    });
  }

  function cancelEditSpeaker() {
    setEditingSpeakerId(null);
    setSpeakerDraft(emptySpeakerDraft());
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith("speakers.")) delete next[key];
      });
      return next;
    });
  }

  function removeSpeakerById(id) {
    if (editingSpeakerId === id) cancelEditSpeaker();
    onField(
      "speakers",
      (Array.isArray(editing.speakers) ? editing.speakers : []).filter(
        (speaker) => speaker.id !== id,
      ),
    );
  }

  function updatePaymentDetail(field, value) {
    const paymentDetails = normalizePaymentDetails(editing.paymentDetails);
    onField("paymentDetails", { ...paymentDetails, [field]: value });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[paymentFieldKey(field)];
      return next;
    });
  }

  function setRequiresPayment(requiresPayment) {
    onField("requiresPayment", requiresPayment);
    if (!requiresPayment) {
      onField("paymentDetails", emptyPaymentDetails());
      onField("paidContentVisibility", { ...DEFAULT_PAID_VISIBILITY });
      setFieldErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith("paymentDetails.") || key.startsWith("paidContentVisibility.")) {
            delete next[key];
          }
        });
        return next;
      });
    }
  }

  function updatePaidVisibility(key, checked) {
    const visibility = normalizePaidContentVisibility(editing.paidContentVisibility);
    onField("paidContentVisibility", { ...visibility, [key]: checked });
  }

  function updateOnlineStreamField(field, value) {
    const stream = normalizeOnlineStream(editing.onlineStream);
    onField("onlineStream", { ...stream, [field]: value });
  }

  function updateContactField(field, value) {
    const contacts = normalizeContacts(editing.contacts);
    onField("contacts", { ...contacts, [field]: value });
  }

  function addContactEmail() {
    const email = newContactEmail.trim();
    if (!email) return;
    const contacts = normalizeContacts(editing.contacts);
    if (contacts.emails.some((item) => item.toLowerCase() === email.toLowerCase())) {
      setNewContactEmail("");
      return;
    }
    onField("contacts", { ...contacts, emails: [...contacts.emails, email] });
    setNewContactEmail("");
  }

  function removeContactEmail(index) {
    const contacts = normalizeContacts(editing.contacts);
    const emails = [...contacts.emails];
    emails.splice(index, 1);
    onField("contacts", { ...contacts, emails });
  }

  function updateFaqDraft(field, value) {
    setFaqDraft((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[faqFieldKey(field)];
      return next;
    });
  }

  function addFaq() {
    const draftErrors = {};
    const question = faqDraft.question?.trim();

    if (!question) draftErrors[faqFieldKey("question")] = "Question is required.";
    if (isRichTextEmpty(faqDraft.answer)) {
      draftErrors[faqFieldKey("answer")] = "Answer description is required.";
    }

    if (Object.keys(draftErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...draftErrors }));
      setActiveSection("faqs");
      return;
    }

    const entry = normalizeFaq({
      id: createFaqId(),
      question,
      answer: faqDraft.answer,
    });

    if (!entry) return;

    onField("faqs", [...(Array.isArray(editing.faqs) ? editing.faqs : []), entry]);
    setFaqDraft(emptyFaqDraft());
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith("faqs.")) delete next[key];
      });
      return next;
    });
  }

  function removeFaqById(id) {
    onField(
      "faqs",
      (Array.isArray(editing.faqs) ? editing.faqs : []).filter((faq) => faq.id !== id),
    );
  }

  async function onSpeakerPhotoUpload(file) {
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        [speakerFieldKey("photo")]: "Only JPG, PNG, and WEBP image formats are allowed.",
      }));
      setActiveSection("speakers");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        [speakerFieldKey("photo")]: "Image exceeds 5MB limit.",
      }));
      setActiveSection("speakers");
      return;
    }

    setUploadingSpeakerPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/uploads/speaker-photo", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not upload speaker photo.");
      }
      updateSpeakerDraft("photo", data.url);
      toast.success(data.message || "Speaker photo uploaded successfully.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed.";
      setError(message);
      toast.error(message);
    } finally {
      setUploadingSpeakerPhoto(false);
    }
  }

  function onJsonField(name, value) {
    try {
      const parsed = value.trim() ? JSON.parse(value) : [];
      if (!Array.isArray(parsed)) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: `${name} must be a JSON array.`,
        }));
        return;
      }
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setEditing((prev) => ({ ...prev, [name]: parsed }));
    } catch {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: `Invalid JSON in ${name}.`,
      }));
    }
  }

  function addTopic() {
    const topic = newTopic.trim();
    if (!topic) return;
    const existing = Array.isArray(editing.cfpTopics) ? editing.cfpTopics : [];
    if (existing.some((item) => String(item).toLowerCase() === topic.toLowerCase())) {
      setNewTopic("");
      return;
    }
    onField("cfpTopics", [...existing, topic]);
    setNewTopic("");
  }

  function removeTopic(index) {
    const topics = Array.isArray(editing.cfpTopics) ? [...editing.cfpTopics] : [];
    topics.splice(index, 1);
    onField("cfpTopics", topics);
  }

  function addSubTheme() {
    const subTheme = newSubTheme.trim();
    if (!subTheme) return;
    const existing = Array.isArray(editing.subThemes) ? editing.subThemes : [];
    if (existing.some((item) => String(item).toLowerCase() === subTheme.toLowerCase())) {
      setNewSubTheme("");
      return;
    }
    onField("subThemes", [...existing, subTheme]);
    setNewSubTheme("");
  }

  function removeSubTheme(index) {
    const subThemes = Array.isArray(editing.subThemes) ? [...editing.subThemes] : [];
    subThemes.splice(index, 1);
    onField("subThemes", subThemes);
  }

  async function onCardImageUpload(file) {
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        cardImage: "Only JPG, PNG, and WEBP image formats are allowed.",
      }));
      setActiveSection("media");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        cardImage: "Image exceeds 5MB limit.",
      }));
      setActiveSection("media");
      return;
    }

    setUploadingCardImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/uploads/conference-card", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not upload image.");
      }
      onField("cardImage", data.url);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.cardImage;
        return next;
      });
      toast.success(data.message || "Card image uploaded successfully.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed.";
      setError(message);
      toast.error(message);
    } finally {
      setUploadingCardImage(false);
    }
  }

  async function saveAs(status) {
    const publishMode = status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    const validationErrors = validateConferenceForm(editing, publishMode);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      const firstSection = firstSectionWithErrors(validationErrors);
      if (firstSection) setActiveSection(firstSection);
      if (publishMode === "PUBLISHED") {
        toast.error("Complete all required fields (marked with *) before publishing.");
      }
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = normalizeForSubmit(editing, status);
      const isUpdate = Boolean(editing.id);
      const res = await fetch(
        isUpdate ? `/api/admin/conferences/${editing.id}` : "/api/admin/conferences",
        {
          method: isUpdate ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save conference.");

      const saved = data.conference;
      setEditing((prev) => ({
        ...prev,
        ...saved,
        startDate: toInputDate(saved.startDate),
        endDate: toInputDate(saved.endDate),
        cfpOpenAt: toInputDate(saved.cfpOpenAt),
        cfpCloseAt: toInputDate(saved.cfpCloseAt),
        registrationOpenAt: toInputDate(saved.registrationOpenAt),
        registrationCloseAt: toInputDate(saved.registrationCloseAt),
        timezone: saved.timezone || "Africa/Nairobi",
        conferenceDays: Array.isArray(saved.conferenceDays) ? saved.conferenceDays : [],
        ...mapConferenceFormExtras(saved),
      }));

      setList((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        if (idx === -1) return [saved, ...prev];
        const next = [...prev];
        next[idx] = saved;
        return next;
      });
      toast.success(data.message || (status === "PUBLISHED" ? "Conference published." : "Draft saved."));
      localStorage.removeItem(getDraftStorageKey(editing.id));
      localStorage.removeItem(getDraftStorageKey(saved.id));
      setIsFormOpen(false);
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  function requestDelete(conf) {
    setDeleteTarget(conf);
    setDeleteConfirmText("");
  }

  async function confirmDeleteConference() {
    if (!deleteTarget?.id) return;
    if (deleteConfirmText !== "DELETE") {
      setError("Type DELETE to confirm conference deletion.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/conferences/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      setList((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (editing.id === deleteTarget.id) beginCreate();
      setDeleteTarget(null);
      setDeleteConfirmText("");
      toast.success(data.message || "Conference deleted successfully.");
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Conferences</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create, edit, save drafts, and publish conferences. Only published
              conferences appear on public pages.
            </p>
          </div>
          <Button variant="primary" icon={Plus} onClick={beginCreate}>
            New Conference
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Conference listing</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Draft and published conferences with quick actions.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Icon
              icon={Search}
              size="sm"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, category, location..."
              className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm text-foreground"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No conferences found.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((conf) => (
              <article
                key={conf.id}
                className="overflow-hidden rounded-lg border border-border bg-background shadow-sm"
              >
                <div className="relative h-40 w-full overflow-hidden">
                  <ConferenceImage src={conf.cardImage} alt={conf.title} />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-foreground">
                    <Icon icon={CircleDot} size="sm" className="text-primary" />
                    {PUBLICATION_LABELS[conf.publicationStatus] ?? conf.publicationStatus}
                  </div>
                  <div className="absolute right-3 top-3 rounded-md bg-primary-light px-2 py-1 text-[11px] font-medium text-primary">
                    {STATUS_LABELS[conf.status] ?? conf.status}
                  </div>
                  <h3 className="absolute bottom-3 left-3 right-3 line-clamp-2 text-base font-semibold text-white">
                    {conf.title}
                  </h3>
                </div>

                <div className="space-y-3 p-4">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {conf.shortDescription || conf.description?.slice(0, 120) || "No description yet."}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon icon={Calendar} size="sm" className="text-primary" />
                    {conf.dateRange || "Dates pending"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon icon={MapPin} size="sm" className="text-primary" />
                    {conf.location || "Location pending"}
                  </div>
                  <div className="rounded-md bg-surface px-2 py-1 text-xs text-muted-foreground">
                    {conf.category || "Uncategorized"}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Eye}
                      href={`/dashboard/manage/${conf.id}`}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Pencil}
                      disabled={loading}
                      onClick={() => beginEdit(conf)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      disabled={loading}
                      onClick={() => requestDelete(conf)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editing.id ? "Edit Conference" : "Create Conference"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Fill in details and save as draft or publish.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md p-2 text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label="Close form"
              >
                <Icon icon={X} size="md" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-132px)] overflow-y-auto px-5 py-5 pb-8 sm:px-6">
              <div className="sticky top-0 z-10 -mx-5 border-b border-border bg-surface px-5 pb-4 pt-1 sm:-mx-6 sm:px-6">
                <div className="flex flex-wrap gap-2">
                {FORM_SECTIONS.map((section) => {
                  const tabHasErrors = sectionHasErrors(fieldErrors, section.id);
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        activeSection === section.id
                          ? tabHasErrors
                            ? "bg-error/10 text-error ring-1 ring-error"
                            : "bg-primary-light text-primary"
                          : tabHasErrors
                            ? "border border-error bg-error/10 text-error"
                            : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {section.label}
                    </button>
                  );
                })}
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Fields marked with <span className="text-error">*</span> are required before
                publishing.
              </p>

              <div className="mt-6 space-y-4">
                {activeSection === "basics" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <SectionErrorAlert messages={getSectionErrorMessages(fieldErrors, "basics")} />
                    </div>
                    <Input
                      label="Title"
                      value={editing.title}
                      onChange={(e) => onField("title", e.target.value)}
                      error={fieldErrors.title}
                      requiredMark
                    />
                    <Input
                      label="Slug"
                      value={editing.slug}
                      onChange={(e) => onField("slug", e.target.value)}
                      hint="Optional. Auto-generated from title if blank."
                    />
                    <div className="sm:col-span-2">
                      <FieldLabel required>Description</FieldLabel>
                      <textarea
                        className={`min-h-28 w-full rounded-md border bg-surface px-3 py-2 text-sm text-foreground ${
                          fieldErrors.description ? "border-error" : "border-border"
                        }`}
                        value={editing.description}
                        onChange={(e) => onField("description", e.target.value)}
                      />
                      {fieldErrors.description ? (
                        <p className="mt-1.5 text-xs text-error">{fieldErrors.description}</p>
                      ) : null}
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        label="Main theme"
                        value={editing.theme}
                        onChange={(e) => onField("theme", e.target.value)}
                        hint="The primary theme for this conference."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Sub-themes
                      </label>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Add sub-themes one by one. You can add as many as needed or remove any
                        time.
                      </p>
                      <div className="flex gap-2">
                        <input
                          className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                          value={newSubTheme}
                          onChange={(e) => setNewSubTheme(e.target.value)}
                          placeholder="e.g. Inclusive Education"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSubTheme();
                            }
                          }}
                        />
                        <Button variant="outline" size="sm" icon={Plus} onClick={addSubTheme}>
                          Add
                        </Button>
                      </div>
                      {editing.subThemes?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {editing.subThemes.map((subTheme, index) => (
                            <span
                              key={`${subTheme}-${index}`}
                              className="inline-flex items-center gap-1 rounded-md bg-primary-light px-2 py-1 text-xs text-primary"
                            >
                              {subTheme}
                              <button
                                type="button"
                                className="rounded p-0.5 hover:bg-primary/10"
                                aria-label={`Remove sub-theme ${subTheme}`}
                                onClick={() => removeSubTheme(index)}
                              >
                                <Icon icon={X} size="sm" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No sub-themes added yet.</p>
                      )}
                    </div>
                    <div>
                      <FieldLabel required>Category</FieldLabel>
                      <select
                        value={editing.category}
                        onChange={(e) => onField("category", e.target.value)}
                        className={`h-10 w-full rounded-md border bg-surface px-3 text-sm text-foreground ${
                          fieldErrors.category ? "border-error" : "border-border"
                        }`}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.category ? (
                        <p className="mt-1.5 text-xs text-error">{fieldErrors.category}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Publication status
                      </label>
                      <select
                        value={editing.publicationStatus}
                        onChange={(e) => onField("publicationStatus", e.target.value)}
                        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-7">
                      <input
                        id="featured-checkbox"
                        type="checkbox"
                        checked={Boolean(editing.featured)}
                        onChange={(e) => onField("featured", e.target.checked)}
                      />
                      <label htmlFor="featured-checkbox" className="text-sm text-foreground">
                        Featured conference
                      </label>
                    </div>
                  </div>
                ) : null}

                {activeSection === "schedule" ? (
                  <div className="space-y-6">
                    <SectionErrorAlert messages={getSectionErrorMessages(fieldErrors, "schedule")} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Call for Papers opens on"
                        type="date"
                        value={editing.cfpOpenAt}
                        error={fieldErrors.cfpOpenAt}
                        onChange={(e) => onField("cfpOpenAt", e.target.value)}
                      />
                      <Input
                        label="Call for Papers closes on"
                        type="date"
                        value={editing.cfpCloseAt}
                        error={fieldErrors.cfpCloseAt}
                        onChange={(e) => onField("cfpCloseAt", e.target.value)}
                      />
                      <Input
                        label="Registration opens on"
                        type="date"
                        value={editing.registrationOpenAt}
                        error={fieldErrors.registrationOpenAt}
                        onChange={(e) => onField("registrationOpenAt", e.target.value)}
                        requiredMark
                      />
                      <Input
                        label="Registration closes on"
                        type="date"
                        value={editing.registrationCloseAt}
                        error={fieldErrors.registrationCloseAt}
                        onChange={(e) => onField("registrationCloseAt", e.target.value)}
                        requiredMark
                      />
                    </div>

                    <Input
                      label="Timezone"
                      value={editing.timezone}
                      onChange={(e) => onField("timezone", e.target.value)}
                      error={fieldErrors.timezone}
                      hint="Default: Africa/Nairobi"
                      requiredMark
                    />

                    <div className="rounded-lg border border-border bg-background p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">
                            Conference days <span className="text-error">*</span>
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Add one or more conference days with start/end times.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" icon={Plus} onClick={addConferenceDay}>
                          Add day
                        </Button>
                      </div>

                      {!editing.conferenceDays?.length ? (
                        <p className="text-xs text-muted-foreground">No conference days added yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {editing.conferenceDays.map((day, index) => (
                            <div
                              key={`${day.date || "day"}-${index}`}
                              className="grid gap-3 rounded-md border border-border bg-surface p-3 sm:grid-cols-4"
                            >
                              <Input
                                label="Date"
                                type="date"
                                value={day.date || ""}
                                error={fieldErrors[`conferenceDays.${index}.date`]}
                                onChange={(e) =>
                                  updateConferenceDay(index, "date", e.target.value)
                                }
                                requiredMark
                              />
                              <Input
                                label="Start time"
                                type="time"
                                value={day.startTime || ""}
                                error={fieldErrors[`conferenceDays.${index}.startTime`]}
                                onChange={(e) =>
                                  updateConferenceDay(index, "startTime", e.target.value)
                                }
                                requiredMark
                              />
                              <Input
                                label="End time"
                                type="time"
                                value={day.endTime || ""}
                                error={fieldErrors[`conferenceDays.${index}.endTime`]}
                                onChange={(e) =>
                                  updateConferenceDay(index, "endTime", e.target.value)
                                }
                                requiredMark
                              />
                              <div className="flex items-end">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  icon={Trash2}
                                  onClick={() => removeConferenceDay(index)}
                                  className="w-full"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {fieldErrors.conferenceDays ? (
                        <p className="mt-2 text-xs text-error">{fieldErrors.conferenceDays}</p>
                      ) : null}
                    </div>

                    <Input
                      label="Location"
                      value={editing.location}
                      error={fieldErrors.location}
                      onChange={(e) => onField("location", e.target.value)}
                      requiredMark
                    />
                    <Input
                      label="Venue"
                      value={editing.venue}
                      error={fieldErrors.venue}
                      onChange={(e) => onField("venue", e.target.value)}
                      requiredMark
                    />

                    <div className="rounded-lg border border-border bg-background p-4">
                      <h4 className="text-sm font-semibold text-foreground">Online stream</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Optional. Links can be restricted on public pages when payment is required.
                      </p>
                      <div className="mt-4 space-y-4">
                        <Input
                          label="YouTube link"
                          value={normalizeOnlineStream(editing.onlineStream).youtubeLink}
                          onChange={(e) => updateOnlineStreamField("youtubeLink", e.target.value)}
                          placeholder="https://youtube.com/watch?v=..."
                        />
                        <div>
                          <FieldLabel>Zoom details</FieldLabel>
                          <textarea
                            className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                            value={normalizeOnlineStream(editing.onlineStream).zoomDetails}
                            onChange={(e) =>
                              updateOnlineStreamField("zoomDetails", e.target.value)
                            }
                            placeholder="Paste Zoom link, meeting ID, and passcode. URLs will be clickable on public pages."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeSection === "media" ? (
                  <div className="space-y-4">
                    <SectionErrorAlert messages={getSectionErrorMessages(fieldErrors, "media")} />
                    <Input
                      label="Card image URL"
                      value={editing.cardImage}
                      onChange={(e) => onField("cardImage", e.target.value)}
                      error={fieldErrors.cardImage}
                      hint="Paste a direct image URL or upload a file below."
                      requiredMark
                    />
                    <div className="rounded-md border border-border bg-background p-4">
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Upload card image
                      </label>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Allowed formats: JPG, PNG, WEBP. Max size: 5MB. Uploads are compressed
                        and stored on the server.
                      </p>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={(e) => onCardImageUpload(e.target.files?.[0])}
                        disabled={uploadingCardImage}
                        className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-neutral-50"
                      />
                      {uploadingCardImage ? (
                        <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <Icon icon={Upload} size="sm" />
                          Uploading and compressing image...
                        </p>
                      ) : null}
                    </div>
                    {editing.cardImage ? (
                      <div className="relative h-44 w-full overflow-hidden rounded-md border border-border bg-background">
                        <ConferenceImage src={editing.cardImage} alt="Card preview" />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeSection === "cfp" ? (
                  <div className="space-y-4">
                    <SectionErrorAlert messages={getSectionErrorMessages(fieldErrors, "cfp")} />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        CFP topics
                      </label>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Add topics one by one so submitters can select them clearly later.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          placeholder="e.g. Curriculum Assessment"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTopic();
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Plus}
                          onClick={addTopic}
                          className="shrink-0 sm:w-auto"
                        >
                          Add topic
                        </Button>
                      </div>
                      {editing.cfpTopics?.length ? (
                        <ul className="mt-3 space-y-2">
                          {editing.cfpTopics.map((topic, index) => (
                            <li
                              key={`${topic}-${index}`}
                              className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm"
                            >
                              <span className="min-w-0 flex-1 text-foreground">{topic}</span>
                              <button
                                type="button"
                                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-neutral-100 hover:text-error"
                                aria-label={`Remove topic ${topic}`}
                                onClick={() => removeTopic(index)}
                              >
                                <Icon icon={X} size="sm" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No topics added yet.</p>
                      )}
                    </div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Submission guidelines
                    </label>
                    <RichTextEditor
                      value={editing.submissionGuidelines}
                      onChange={(value) => onField("submissionGuidelines", value)}
                    />
                    <p className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                      CFP and registration opening/closing dates are managed in
                      <span className="font-medium text-foreground"> Schedule & venue</span>.
                    </p>
                  </div>
                ) : null}

                {activeSection === "programme" ? (
                  <div className="space-y-4">
                    <SectionErrorAlert messages={getSectionErrorMessages(fieldErrors, "programme")} />
                    <p className="text-xs text-muted-foreground">
                      Add programme items under each conference date. Times must be inside the
                      day window and cannot overlap.
                    </p>
                    {(editing.conferenceDays || []).filter((day) => day.date).length === 0 ? (
                      <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                        Add conference dates first under Schedule & venue.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {(editing.conferenceDays || [])
                          .filter((day) => day.date)
                          .map((day) => {
                            const dayProgrammes = (editing.programme || [])
                              .map((item, index) => ({ ...item, __index: index }))
                              .filter((item) => item.date === day.date)
                              .sort((a, b) =>
                                (a.startTime || "").localeCompare(b.startTime || ""),
                              );
                            const draft = programmeDrafts[day.date] || {
                              title: "",
                              startTime: "",
                              endTime: "",
                            };
                            const dayHasErrors = ["title", "startTime", "endTime", "_form"].some(
                              (field) => fieldErrors[programmeFieldKey(day.date, field)],
                            );

                            return (
                              <div
                                key={`programme-${day.date}`}
                                className={`rounded-lg border bg-background p-4 ${
                                  dayHasErrors ? "border-error" : "border-border"
                                }`}
                              >
                                <div className="mb-3">
                                  <h4 className="text-sm font-semibold text-foreground">
                                    {formatProgrammeDayLabel(day.date)}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    Allowed time: {day.startTime || "00:00"} – {day.endTime || "23:59"}
                                  </p>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                  <div className="w-full sm:w-28">
                                    <Input
                                      label="Start time"
                                      type="time"
                                      value={draft.startTime}
                                      error={fieldErrors[programmeFieldKey(day.date, "startTime")]}
                                      onChange={(e) =>
                                        updateProgrammeDraft(day.date, "startTime", e.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="w-full sm:w-28">
                                    <Input
                                      label="End time"
                                      type="time"
                                      value={draft.endTime}
                                      error={fieldErrors[programmeFieldKey(day.date, "endTime")]}
                                      onChange={(e) =>
                                        updateProgrammeDraft(day.date, "endTime", e.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <Input
                                      label="Programme item"
                                      value={draft.title}
                                      error={fieldErrors[programmeFieldKey(day.date, "title")]}
                                      onChange={(e) =>
                                        updateProgrammeDraft(day.date, "title", e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                {fieldErrors[programmeFieldKey(day.date, "_form")] ? (
                                  <p className="mt-2 text-xs text-error">
                                    {fieldErrors[programmeFieldKey(day.date, "_form")]}
                                  </p>
                                ) : null}
                                <div className="mt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    icon={Plus}
                                    onClick={() => addProgrammeEntry(day.date)}
                                  >
                                    Add programme item
                                  </Button>
                                </div>

                                {dayProgrammes.length ? (
                                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                                    {dayProgrammes.map((item) => (
                                      <div
                                        key={`${item.date}-${item.startTime}-${item.__index}`}
                                        className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5"
                                      >
                                        <p className="w-24 shrink-0 text-xs font-bold tabular-nums text-foreground sm:w-28">
                                          {formatProgrammeTimeSlot(item.startTime, item.endTime)}
                                        </p>
                                        <p className="min-w-0 flex-1 text-sm font-medium text-primary">
                                          {item.title}
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          icon={Trash2}
                                          onClick={() => removeProgrammeEntry(item.__index)}
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                                    No programme items added for this date.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeSection === "speakers" ? (
                  <div className="space-y-4">
                    <SectionErrorAlert messages={getSectionErrorMessages(fieldErrors, "speakers")} />
                    <p className="text-xs text-muted-foreground">
                      Add speakers with a photo and title. Choose whether they appear on all
                      conference dates or only on selected dates.
                    </p>

                    <div className="rounded-lg border border-border bg-background p-4">
                      <h4 className="text-sm font-semibold text-foreground">
                        {editingSpeakerId ? "Edit speaker" : "Add speaker"}
                      </h4>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Input
                          label="Speaker name"
                          value={speakerDraft.name}
                          error={fieldErrors[speakerFieldKey("name")]}
                          onChange={(e) => updateSpeakerDraft("name", e.target.value)}
                        />
                        <Input
                          label="Speaker title"
                          value={speakerDraft.title}
                          error={fieldErrors[speakerFieldKey("title")]}
                          onChange={(e) => updateSpeakerDraft("title", e.target.value)}
                          placeholder="e.g. Director General, NCDC"
                        />
                      </div>
                      <div className="mt-4">
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Speaker type
                        </label>
                        <select
                          value={speakerDraft.speakerType}
                          onChange={(e) => updateSpeakerDraft("speakerType", e.target.value)}
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground sm:max-w-xs"
                        >
                          {SPEAKER_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-4 rounded-md border border-border bg-surface p-4">
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Speaker photo
                        </label>
                        <p className="mb-3 text-xs text-muted-foreground">
                          JPG, PNG, or WEBP. Max 5MB. Square crop recommended.
                        </p>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={(e) => onSpeakerPhotoUpload(e.target.files?.[0])}
                          disabled={uploadingSpeakerPhoto}
                          className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-neutral-50"
                        />
                        {uploadingSpeakerPhoto ? (
                          <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <Icon icon={Upload} size="sm" />
                            Uploading photo...
                          </p>
                        ) : null}
                        {fieldErrors[speakerFieldKey("photo")] ? (
                          <p className="mt-2 text-xs text-error">
                            {fieldErrors[speakerFieldKey("photo")]}
                          </p>
                        ) : null}
                        {speakerDraft.photo ? (
                          <div className="relative mt-3 h-32 w-32 overflow-hidden rounded-md border border-border bg-background">
                            <ConferenceImage
                              src={speakerDraft.photo}
                              alt="Speaker preview"
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-4">
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Appears on
                        </label>
                        <div className="space-y-2">
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                            <input
                              type="radio"
                              name="speaker-schedule-mode"
                              checked={speakerDraft.scheduleMode === "all"}
                              onChange={() =>
                                setSpeakerDraft((prev) => ({
                                  ...prev,
                                  scheduleMode: "all",
                                  dates: [],
                                }))
                              }
                            />
                            All conference dates
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                            <input
                              type="radio"
                              name="speaker-schedule-mode"
                              checked={speakerDraft.scheduleMode === "specific"}
                              onChange={() => updateSpeakerDraft("scheduleMode", "specific")}
                            />
                            Specific dates only
                          </label>
                        </div>
                        {speakerDraft.scheduleMode === "specific" ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(editing.conferenceDays || [])
                              .filter((day) => day.date)
                              .map((day) => {
                                const checked = speakerDraft.dates.includes(day.date);
                                return (
                                  <label
                                    key={`speaker-date-${day.date}`}
                                    className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium ${
                                      checked
                                        ? "border-primary bg-primary-light text-primary"
                                        : "border-border bg-background text-foreground"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={checked}
                                      onChange={() => toggleSpeakerDraftDate(day.date)}
                                    />
                                    {formatProgrammeDayLabel(day.date)}
                                  </label>
                                );
                              })}
                          </div>
                        ) : null}
                        {fieldErrors[speakerFieldKey("dates")] ? (
                          <p className="mt-2 text-xs text-error">
                            {fieldErrors[speakerFieldKey("dates")]}
                          </p>
                        ) : null}
                        {(editing.conferenceDays || []).filter((day) => day.date).length === 0 ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Add conference dates in Schedule &amp; venue first.
                          </p>
                        ) : null}
                      </div>
                      <label className="mb-1.5 mt-4 block text-sm font-medium text-foreground">
                        Bio (optional)
                      </label>
                      <textarea
                        className="min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                        value={speakerDraft.bio}
                        onChange={(e) => updateSpeakerDraft("bio", e.target.value)}
                        placeholder="Short biography or expertise summary"
                      />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={editingSpeakerId ? Save : Plus}
                          onClick={saveSpeaker}
                        >
                          {editingSpeakerId ? "Update speaker" : "Add speaker"}
                        </Button>
                        {editingSpeakerId ? (
                          <Button variant="ghost" size="sm" onClick={cancelEditSpeaker}>
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {(() => {
                      const speakers = Array.isArray(editing.speakers) ? editing.speakers : [];
                      const conferenceDays = (editing.conferenceDays || []).filter(
                        (day) => day.date,
                      );

                      function renderSpeakerCard(speaker) {
                        const scheduleLabel =
                          speaker.scheduleMode === "all" || !speaker.dates?.length
                            ? "All conference dates"
                            : speaker.dates
                                .map((date) => formatProgrammeDayLabel(date))
                                .join(", ");

                        return (
                          <div
                            key={speaker.id}
                            className="flex gap-3 rounded-md border border-border bg-surface px-3 py-3"
                          >
                            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-background">
                              {speaker.photo ? (
                                <ConferenceImage
                                  src={speaker.photo}
                                  alt={speaker.name}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-xs text-muted-foreground">
                                  No photo
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground">{speaker.name}</p>
                              <p className="text-sm text-primary">{speaker.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {SPEAKER_TYPE_LABELS[speaker.speakerType] || "Speaker"}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{scheduleLabel}</p>
                              {speaker.bio ? (
                                <p className="mt-2 text-xs text-foreground">{speaker.bio}</p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Pencil}
                                onClick={() => beginEditSpeaker(speaker)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                onClick={() => removeSpeakerById(speaker.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      if (speakers.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">No speakers added yet.</p>
                        );
                      }

                      const allDateSpeakers = speakers.filter(
                        (speaker) =>
                          speaker.scheduleMode === "all" || !speaker.dates?.length,
                      );

                      return (
                        <div className="space-y-6">
                          {allDateSpeakers.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">
                                All conference dates
                              </h4>
                              <div className="mt-3 space-y-2">
                                {allDateSpeakers.map(renderSpeakerCard)}
                              </div>
                            </div>
                          ) : null}

                          {conferenceDays.map((day) => {
                            const daySpeakers = speakers.filter(
                              (speaker) =>
                                speaker.scheduleMode === "specific" &&
                                speaker.dates?.includes(day.date),
                            );
                            return (
                              <div key={`speakers-day-${day.date}`}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <h4 className="text-sm font-semibold text-foreground">
                                    {formatProgrammeDayLabel(day.date)}
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => prepareSpeakerDraftForDate(day.date)}
                                  >
                                    Add to this date
                                  </Button>
                                </div>
                                {daySpeakers.length > 0 ? (
                                  <div className="mt-3 space-y-2">
                                    {daySpeakers.map(renderSpeakerCard)}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    No speakers assigned to this date yet.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : null}

                {activeSection === "faqs" ? (
                  <div className="space-y-4">
                    <SectionErrorAlert messages={getSectionErrorMessages(fieldErrors, "faqs")} />
                    <p className="text-xs text-muted-foreground">
                      Add frequently asked questions one at a time. Use the rich text editor for
                      the answer description.
                    </p>

                    <div className="rounded-lg border border-border bg-background p-4">
                      <h4 className="text-sm font-semibold text-foreground">Add FAQ</h4>
                      <div className="mt-4">
                        <Input
                          label="Question"
                          value={faqDraft.question}
                          error={fieldErrors[faqFieldKey("question")]}
                          onChange={(e) => updateFaqDraft("question", e.target.value)}
                          placeholder="e.g. Who can submit papers?"
                        />
                      </div>
                      <div className="mt-4">
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Answer
                        </label>
                        <div
                          className={
                            fieldErrors[faqFieldKey("answer")]
                              ? "rounded-md ring-1 ring-error"
                              : ""
                          }
                        >
                          <RichTextEditor
                            value={faqDraft.answer}
                            onChange={(value) => updateFaqDraft("answer", value)}
                          />
                        </div>
                        {fieldErrors[faqFieldKey("answer")] ? (
                          <p className="mt-1.5 text-xs text-error">
                            {fieldErrors[faqFieldKey("answer")]}
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-4">
                        <Button variant="outline" size="sm" icon={Plus} onClick={addFaq}>
                          Add FAQ
                        </Button>
                      </div>
                    </div>

                    {Array.isArray(editing.faqs) && editing.faqs.length > 0 ? (
                      <div className="space-y-3 border-t border-border pt-4">
                        {editing.faqs.map((faq) => (
                          <div
                            key={faq.id}
                            className="rounded-md border border-border bg-surface px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">
                                {faq.question}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                onClick={() => removeFaqById(faq.id)}
                              >
                                Remove
                              </Button>
                            </div>
                            {faq.answer ? (
                              <div
                                className="prose prose-sm mt-2 max-w-none text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: faq.answer }}
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No FAQs added yet.</p>
                    )}
                  </div>
                ) : null}

                {activeSection === "payments" ? (
                  <div className="space-y-4">
                    <SectionErrorAlert messages={getSectionErrorMessages(fieldErrors, "payments")} />
                    <p className="text-xs text-muted-foreground">
                      Choose whether attendees must pay to register. If payment is required, provide
                      bank transfer details.
                    </p>

                    <div className="space-y-2 rounded-lg border border-border bg-background p-4">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input
                          type="radio"
                          name="requires-payment"
                          checked={!editing.requiresPayment}
                          onChange={() => setRequiresPayment(false)}
                        />
                        Does not require payment
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input
                          type="radio"
                          name="requires-payment"
                          checked={Boolean(editing.requiresPayment)}
                          onChange={() => setRequiresPayment(true)}
                        />
                        Requires payment
                      </label>
                    </div>

                    {editing.requiresPayment ? (
                      <div className="rounded-lg border border-border bg-background p-4">
                        <h4 className="text-sm font-semibold text-foreground">Payment details</h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          These details are shown to registrants when payment is required.
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          {PAYMENT_DETAIL_FIELDS.map((field) => (
                            <Input
                              key={field.key}
                              label={field.label}
                              value={editing.paymentDetails?.[field.key] || ""}
                              error={fieldErrors[paymentFieldKey(field.key)]}
                              onChange={(e) => updatePaymentDetail(field.key, e.target.value)}
                              requiredMark={!field.optional}
                              placeholder={
                                field.key === "accountName"
                                  ? "NCDC Royalty"
                                  : field.key === "accountNumber"
                                    ? "9030005940965"
                                    : field.key === "bankName"
                                      ? "Stanbic"
                                      : field.key === "bankBranch"
                                        ? "Kyambogo"
                                        : field.key === "swiftCode"
                                          ? "SBICUGKX"
                                          : ""
                              }
                            />
                          ))}
                        </div>

                        <div className="mt-6 border-t border-border pt-4">
                          <h4 className="text-sm font-semibold text-foreground">
                            Public &amp; attendee visibility
                          </h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Free conferences show all content. Paid conferences only show what you
                            enable below.
                          </p>
                          <div className="mt-3 space-y-2">
                            {PAID_VISIBILITY_OPTIONS.map((option) => {
                              const visibility = normalizePaidContentVisibility(
                                editing.paidContentVisibility,
                              );
                              return (
                                <label
                                  key={option.key}
                                  className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(visibility[option.key])}
                                    onChange={(e) =>
                                      updatePaidVisibility(option.key, e.target.checked)
                                    }
                                  />
                                  {option.label}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeSection === "contacts" ? (
                  <div className="space-y-4">
                    <SectionErrorAlert messages={getSectionErrorMessages(fieldErrors, "contacts")} />
                    <p className="text-xs text-muted-foreground">
                      Conference contact information for enquiries and support.
                    </p>

                    <div className="rounded-lg border border-border bg-background p-4">
                      <FieldLabel required>Email addresses</FieldLabel>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Add one or more contact emails.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                          value={newContactEmail}
                          onChange={(e) => setNewContactEmail(e.target.value)}
                          placeholder="conference@ncdc.go.ug"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addContactEmail();
                            }
                          }}
                        />
                        <Button variant="outline" size="sm" icon={Plus} onClick={addContactEmail}>
                          Add
                        </Button>
                      </div>
                      {normalizeContacts(editing.contacts).emails.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {normalizeContacts(editing.contacts).emails.map((email, index) => (
                            <span
                              key={`${email}-${index}`}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                            >
                              {email}
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-error"
                                onClick={() => removeContactEmail(index)}
                                aria-label={`Remove ${email}`}
                              >
                                <Icon icon={X} size="sm" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {fieldErrors["contacts.emails"] ? (
                        <p className="mt-2 text-xs text-error">{fieldErrors["contacts.emails"]}</p>
                      ) : null}
                    </div>

                    <Input
                      label="Telephone"
                      value={normalizeContacts(editing.contacts).phone}
                      onChange={(e) => updateContactField("phone", e.target.value)}
                      placeholder="+256 393-112088"
                      error={fieldErrors["contacts.phone"]}
                      requiredMark
                    />
                    <Input
                      label="Website"
                      value={normalizeContacts(editing.contacts).website}
                      onChange={(e) => updateContactField("website", e.target.value)}
                      placeholder="www.ncdc.go.ug"
                    />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        More info (optional)
                      </label>
                      <textarea
                        className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                        value={normalizeContacts(editing.contacts).moreInfo}
                        onChange={(e) => updateContactField("moreInfo", e.target.value)}
                        placeholder="Additional contact notes or office hours"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {error && Object.keys(fieldErrors).length === 0 ? (
                <p className="mt-5 rounded-md bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-border bg-surface px-5 py-4 pb-6 sm:px-6 sm:pb-8">
              <Button
                variant="secondary"
                icon={Save}
                disabled={loading}
                onClick={() => saveAs(editing.publicationStatus || "DRAFT")}
              >
                Save Changes
              </Button>
              <Button variant="ghost" icon={X} disabled={loading} onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl">
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h3 className="text-lg font-semibold text-foreground">Delete conference</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You are about to delete <span className="font-semibold">{deleteTarget.title}</span>.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4 sm:px-6">
              <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
                This action is permanent. All related conference data (such as access keys and
                role assignments) will also be deleted.
              </p>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Type <span className="font-semibold">DELETE</span> to confirm
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  placeholder="DELETE"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-border px-5 py-4 sm:px-6">
              <Button
                variant="danger"
                icon={Trash2}
                disabled={loading || deleteConfirmText !== "DELETE"}
                onClick={confirmDeleteConference}
              >
                Delete permanently
              </Button>
              <Button
                variant="ghost"
                icon={X}
                disabled={loading}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
