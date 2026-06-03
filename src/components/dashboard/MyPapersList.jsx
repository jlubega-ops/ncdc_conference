"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { cn } from "@/lib/cn";
import { PAPER_STATUS_LABELS, PAPER_STATUS_STYLES } from "@/lib/papers/constants";
import { formatAdminDate } from "@/components/dashboard/admin-tabs/AdminTabShell";
import { PaperSubmissionHistory } from "@/components/papers/PaperSubmissionHistory";
import { toast } from "react-toastify";

export function MyPapersList() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [resubmitTitle, setResubmitTitle] = useState("");
  const [resubmitAbstract, setResubmitAbstract] = useState("");
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/me/papers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load papers.");
      setPapers(data.papers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load papers.");
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openPaper(paper) {
    setSelected(paper);
    setResubmitTitle(paper.title);
    setResubmitAbstract(paper.abstract ?? "");
    setResubmitFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (paper.authorHasUnreadFeedback) {
      try {
        await fetch(`/api/me/papers/${paper.id}/read-feedback`, { method: "POST" });
        setPapers((prev) =>
          prev.map((p) =>
            p.id === paper.id ? { ...p, authorHasUnreadFeedback: false } : p,
          ),
        );
        setSelected({ ...paper, authorHasUnreadFeedback: false });
        window.dispatchEvent(new Event("paper-notifications-changed"));
      } catch {
        /* ignore */
      }
    }
  }

  async function handleResubmit(e) {
    e.preventDefault();
    if (!selected) return;
    setResubmitting(true);
    try {
      const body = new FormData();
      body.append("title", resubmitTitle);
      body.append("abstract", resubmitAbstract);
      if (resubmitFile) body.append("file", resubmitFile);
      const res = await fetch(`/api/me/papers/${selected.id}/resubmit`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resubmit paper.");
      toast.success("Paper resubmitted.");
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resubmit paper.");
    } finally {
      setResubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your papers…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (papers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">You have not submitted any papers yet.</p>
        <Button variant="primary" className="mt-4" href="/dashboard/submit-paper">
          Submit a paper
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-neutral-50/80 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Conference</th>
              <th className="px-4 py-3">Paper title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {papers.map((paper) => (
              <tr
                key={paper.id}
                className="cursor-pointer transition-colors hover:bg-primary-light/30"
                onClick={() => openPaper(paper)}
              >
                <td className="px-4 py-3 text-foreground">
                  {paper.conference?.title ?? "—"}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{paper.title}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                      PAPER_STATUS_STYLES[paper.status] ?? PAPER_STATUS_STYLES.DRAFT,
                    )}
                  >
                    {PAPER_STATUS_LABELS[paper.status] ?? paper.status}
                  </span>
                  {paper.isFinalApproved ? (
                    <span className="ml-1 text-xs font-medium text-primary">Final</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatAdminDate(paper.submittedAt || paper.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {paper.authorHasUnreadFeedback ||
                  paper.status === "NEEDS_REVISION" ? (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500"
                      title="New feedback"
                      aria-label="New feedback"
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? "Paper details"}
        size="lg"
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            <p>
              <span className="font-medium text-muted-foreground">Conference: </span>
              {selected.conference?.slug ? (
                <Link
                  href={`/dashboard/my-registrations/${selected.conference.slug}`}
                  className="text-primary hover:underline"
                >
                  {selected.conference.title}
                </Link>
              ) : (
                selected.conference?.title ?? "—"
              )}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Status: </span>
              {PAPER_STATUS_LABELS[selected.status] ?? selected.status}
              {selected.isFinalApproved ? (
                <span className="ml-2 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-white">
                  Final approval
                </span>
              ) : null}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Submitted: </span>
              {formatAdminDate(selected.submittedAt || selected.createdAt)}
            </p>

            {selected.status === "NEEDS_REVISION" && selected.improvementRequest ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900">Action required</p>
                <p className="mt-2 text-foreground">{selected.improvementRequest}</p>
                {selected.reviewNotes ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Comment: </span>
                    {selected.reviewNotes}
                  </p>
                ) : null}
              </div>
            ) : null}

            {selected.abstract ? (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">Abstract</p>
                <div
                  className="prose prose-sm max-w-none rounded-md border border-border bg-background p-3 text-foreground"
                  dangerouslySetInnerHTML={{ __html: selected.abstract }}
                />
              </div>
            ) : null}

            {selected.fileUrl ? (
              <a
                href={selected.fileUrl}
                download
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light"
              >
                <Icon icon={Download} size="sm" />
                Download submitted file
              </a>
            ) : (
              <p className="text-muted-foreground">No file attached to this submission.</p>
            )}

            <PaperSubmissionHistory submission={selected} />

            {selected.status === "NEEDS_REVISION" ? (
              <form className="space-y-4 border-t border-border pt-4" onSubmit={handleResubmit}>
                <p className="font-medium text-foreground">Resubmit revised paper</p>
                <p className="text-xs text-muted-foreground">
                  Your updates are saved on this same submission so the full review history is
                  preserved.
                </p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Title
                  </label>
                  <Input
                    value={resubmitTitle}
                    onChange={(e) => setResubmitTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Abstract
                  </label>
                  <RichTextEditor value={resubmitAbstract} onChange={setResubmitAbstract} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Replace file (optional)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="text-sm"
                    onChange={(e) => setResubmitFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <Button type="submit" variant="primary" disabled={resubmitting}>
                  {resubmitting ? "Submitting…" : "Resubmit paper"}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
