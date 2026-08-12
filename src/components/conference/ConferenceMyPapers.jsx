"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { cn } from "@/lib/cn";
import { PAPER_STATUS_LABELS, PAPER_STATUS_STYLES } from "@/lib/papers/constants";
import { formatAdminDate } from "@/components/dashboard/admin-tabs/AdminTabShell";
import { PaperSubmissionHistory } from "@/components/papers/PaperSubmissionHistory";

/**
 * @param {{ slug: string, conferenceTitle: string, backHref?: string }} props
 */
export function ConferenceMyPapers({ slug, conferenceTitle, backHref }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conferences/${slug}/papers`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load papers.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load papers.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("title", title);
      body.append("abstract", abstract);
      if (file) body.append("file", file);
      const res = await fetch(`/api/conferences/${slug}/papers`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not submit paper.");
      setShowForm(false);
      setTitle("");
      setAbstract("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit paper.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your papers…</p>;
  }

  if (error && !data) {
    return <p className="text-sm text-error">{error}</p>;
  }

  const papers = data?.papers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            My papers
          </p>
          <h1 className="text-xl font-semibold text-foreground">{conferenceTitle}</h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeft}
          href={backHref ?? `/conferences/${slug}`}
          className="shadow-sm"
        >
          Conference home
        </Button>
      </div>

      {!data?.registrationApproved ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Paper submission is only available after your registration is approved.
        </p>
      ) : !data?.cfpOpen ? (
        <p className="rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          The call for papers is not currently open for this conference.
        </p>
      ) : (
        <Button variant="primary" onClick={() => setShowForm(true)}>
          Submit a new paper
        </Button>
      )}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      {papers.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          You have not submitted any papers for this conference yet.
        </p>
      ) : (
        <div className="space-y-3">
          {papers.map((paper) => (
            <button
              key={paper.id}
              type="button"
              onClick={() => setSelected(paper)}
              className="w-full rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-foreground">{paper.title}</p>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-medium",
                    PAPER_STATUS_STYLES[paper.status] ?? PAPER_STATUS_STYLES.DRAFT,
                  )}
                >
                  {PAPER_STATUS_LABELS[paper.status] ?? paper.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Submitted {formatAdminDate(paper.submittedAt || paper.createdAt)}
              </p>
            </button>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Submit paper" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Abstract</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Summarise your paper. You can use headings, lists, and links.
            </p>
            <RichTextEditor value={abstract} onChange={setAbstract} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Paper file (PDF or Word)
            </label>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-4 py-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </Button>
              <span className="text-sm text-muted-foreground">
                {file ? (
                  <span className="font-medium text-foreground">{file.name}</span>
                ) : (
                  "No file chosen"
                )}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">PDF or Word document, max 10MB.</p>
          </div>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit paper"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? "Paper"}
        size="lg"
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            <p>
              <span className="font-medium text-muted-foreground">Status: </span>
              {PAPER_STATUS_LABELS[selected.status] ?? selected.status}
            </p>
            {selected.abstract ? (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">Abstract</p>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: selected.abstract }}
                />
              </div>
            ) : null}
            {selected.fileUrl ? (
              <a
                href={selected.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View submitted file
              </a>
            ) : null}
            {selected.status === "NEEDS_REVISION" && selected.improvementRequest ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900">Action required</p>
                <p className="mt-1 text-foreground">{selected.improvementRequest}</p>
              </div>
            ) : null}

            {selected.status === "ACCEPTED" && selected.isFinalApproved ? (
              <p className="text-sm text-primary">Your paper has received final approval.</p>
            ) : selected.status === "REJECTED" ? (
              <p className="text-sm text-muted-foreground">Your paper was not accepted.</p>
            ) : null}

            <PaperSubmissionHistory submission={selected} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
