"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { PAPER_STATUS_LABELS, PAPER_STATUS_STYLES } from "@/lib/papers/constants";
import { formatAdminDate } from "./AdminTabShell";
import { PaperSubmissionHistory } from "@/components/papers/PaperSubmissionHistory";

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   submission: any | null;
 *   conferenceId: string;
 *   canAssignReviewer?: boolean;
 *   onUpdated: () => void | Promise<void>;
 *   onSubmissionChange?: (submission: any) => void;
 * }} props
 */
export function PaperSubmissionReviewModal({
  open,
  onClose,
  submission,
  conferenceId,
  canAssignReviewer = false,
  onUpdated,
  onSubmissionChange,
}) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [improvementRequest, setImprovementRequest] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assignMode, setAssignMode] = useState("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [newReviewer, setNewReviewer] = useState({ email: "", name: "" });
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  useEffect(() => {
    if (!submission) return;
    setReviewNotes(submission.reviewNotes ?? "");
    setImprovementRequest("");
    setShowRevisionForm(false);
    setShowAssignForm(false);
    setSearchQuery("");
    setSearchResults([]);
  }, [submission]);

  useEffect(() => {
    if (!canAssignReviewer || !showAssignForm || assignMode !== "existing") {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok) setSearchResults(data.users ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, canAssignReviewer, showAssignForm, assignMode]);

  async function review(action) {
    if (!submission) return;
    if (action === "request_revision" && !improvementRequest.trim()) {
      toast.error("Describe what the author should improve.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/submissions/${submission.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            reviewNotes: reviewNotes.trim() || undefined,
            improvementRequest:
              action === "request_revision" ? improvementRequest.trim() : undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update submission.");
      toast.success(
        action === "approve"
          ? "Paper approved."
          : action === "reject"
            ? "Paper rejected."
            : "Revision request sent.",
      );
      onClose();
      await onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update submission.");
    } finally {
      setBusy(false);
    }
  }

  async function assignReviewer(payload) {
    if (!submission) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/submissions/${submission.id}/assign-reviewer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not assign reviewer.");
      toast.success("Reviewer assigned.");
      setShowAssignForm(false);
      setSearchQuery("");
      if (data.submission) {
        onSubmissionChange?.(data.submission);
      }
      await onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign reviewer.");
    } finally {
      setBusy(false);
    }
  }

  const canReview =
    submission &&
    submission.status !== "ACCEPTED" &&
    submission.status !== "REJECTED" &&
    submission.status !== "WITHDRAWN";

  const assignedReviewerId = submission?.assignedReviewer?.id ?? null;
  const assignedReviewerEmail = submission?.assignedReviewer?.email?.toLowerCase() ?? "";

  function isUserAlreadyAssigned(userId, email) {
    if (!assignedReviewerId) return false;
    if (userId && userId === assignedReviewerId) return true;
    if (email && assignedReviewerEmail && email.toLowerCase() === assignedReviewerEmail) {
      return true;
    }
    return false;
  }

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={submission?.title ?? "Paper submission"}
      size="xl"
    >
      {submission ? (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                PAPER_STATUS_STYLES[submission.status] ?? PAPER_STATUS_STYLES.DRAFT,
              )}
            >
              {PAPER_STATUS_LABELS[submission.status] ?? submission.status}
            </span>
            {submission.isFinalApproved ? (
              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-white">
                Final approval
              </span>
            ) : null}
          </div>

          <p>
            <span className="font-medium text-muted-foreground">Author: </span>
            {submission.user?.name || submission.user?.email || "—"}
            {submission.user?.email ? (
              <span className="text-muted-foreground"> ({submission.user.email})</span>
            ) : null}
          </p>
          <p>
            <span className="font-medium text-muted-foreground">Submitted: </span>
            {formatAdminDate(submission.submittedAt || submission.createdAt)}
          </p>

          {submission.assignedReviewer ? (
            <div className="rounded-md border border-primary/25 bg-primary-light px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Assigned reviewer
              </p>
              <p className="mt-1 font-medium text-foreground">
                {submission.assignedReviewer.name || submission.assignedReviewer.email}
              </p>
              <p className="text-sm text-muted-foreground">{submission.assignedReviewer.email}</p>
            </div>
          ) : null}

          {submission.abstract ? (
            <div>
              <p className="mb-2 font-medium text-muted-foreground">Abstract</p>
              <div
                className="prose prose-sm max-w-none rounded-md border border-border bg-background p-3 text-foreground"
                dangerouslySetInnerHTML={{ __html: submission.abstract }}
              />
            </div>
          ) : null}

          {submission.fileUrl ? (
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light"
            >
              Download paper file
            </a>
          ) : null}

          {submission.status === "NEEDS_REVISION" && submission.improvementRequest ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-900">Active revision request</p>
              <p className="mt-1 text-foreground">{submission.improvementRequest}</p>
            </div>
          ) : null}

          {canAssignReviewer ? (
            <div className="border-t border-border pt-4">
              {!showAssignForm ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setShowAssignForm(true)}
                >
                  {submission.assignedReviewer ? "Assign another reviewer" : "Assign reviewer"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Assign reviewer</p>
                  {submission.assignedReviewer ? (
                    <p className="text-xs text-amber-800">
                      Current reviewer:{" "}
                      <strong>
                        {submission.assignedReviewer.name || submission.assignedReviewer.email}
                      </strong>
                      . You cannot assign the same person again.
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium",
                        assignMode === "existing"
                          ? "bg-primary text-white"
                          : "bg-neutral-100 text-muted-foreground",
                      )}
                      onClick={() => setAssignMode("existing")}
                    >
                      Existing user
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium",
                        assignMode === "new"
                          ? "bg-primary text-white"
                          : "bg-neutral-100 text-muted-foreground",
                      )}
                      onClick={() => setAssignMode("new")}
                    >
                      New reviewer
                    </button>
                  </div>
                  {assignMode === "existing" ? (
                    <>
                      <Input
                        placeholder="Search by email or name…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searching ? (
                        <p className="text-xs text-muted-foreground">Searching…</p>
                      ) : null}
                      <ul className="max-h-32 space-y-1 overflow-y-auto">
                        {searchResults.map((u) => {
                          const alreadyAssigned = isUserAlreadyAssigned(u.id, u.email);
                          return (
                            <li key={u.id}>
                              <button
                                type="button"
                                className={cn(
                                  "w-full rounded-md px-2 py-1.5 text-left text-sm",
                                  alreadyAssigned
                                    ? "cursor-not-allowed bg-neutral-50 text-muted-foreground"
                                    : "hover:bg-primary-light",
                                )}
                                disabled={busy || alreadyAssigned}
                                onClick={() => assignReviewer({ userId: u.id })}
                              >
                                {u.name || u.email}
                                <span className="text-muted-foreground"> — {u.email}</span>
                                {alreadyAssigned ? (
                                  <span className="ml-2 text-xs font-medium text-primary">
                                    Already assigned
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : (
                    <form
                      className="space-y-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (isUserAlreadyAssigned(null, newReviewer.email)) {
                          toast.error("This reviewer is already assigned to this paper.");
                          return;
                        }
                        assignReviewer({
                          mode: "new",
                          email: newReviewer.email,
                          name: newReviewer.name,
                        });
                      }}
                    >
                      <Input
                        type="email"
                        required
                        placeholder="Email"
                        value={newReviewer.email}
                        onChange={(e) =>
                          setNewReviewer((s) => ({ ...s, email: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Name (optional)"
                        value={newReviewer.name}
                        onChange={(e) =>
                          setNewReviewer((s) => ({ ...s, name: e.target.value }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        New reviewers receive an activation email with a temporary password.
                      </p>
                      <Button type="submit" size="sm" variant="primary" disabled={busy}>
                        Create & assign
                      </Button>
                    </form>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setShowAssignForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          {canReview ? (
            <div className="space-y-4 border-t border-border pt-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Comment to author (optional, included in email)
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
              {showRevisionForm ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Requested improvements *
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    value={improvementRequest}
                    onChange={(e) => setImprovementRequest(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busy}
                  onClick={() => review("approve")}
                >
                  Approve (final)
                </Button>
                {!showRevisionForm ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setShowRevisionForm(true)}
                  >
                    Suggest improvements
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setShowRevisionForm(false);
                        setImprovementRequest("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={busy}
                      onClick={() => review("request_revision")}
                    >
                      Send revision request
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  className="text-error"
                  onClick={() => setShowRejectConfirm(true)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : (
            <p className="border-t border-border pt-4 text-sm text-muted-foreground">
              This submission is closed for review. Expand submission history below to see all
              comments, revision requests, and resubmissions.
            </p>
          )}

          <PaperSubmissionHistory submission={submission} />
        </div>
      ) : null}
    </Modal>
    <ConfirmModal
      open={showRejectConfirm}
      onClose={() => !busy && setShowRejectConfirm(false)}
      onConfirm={() => {
        setShowRejectConfirm(false);
        review("reject");
      }}
      title="Reject submission"
      message="Reject this paper submission? The author will be notified."
      confirmLabel="Reject"
      variant="danger"
      loading={busy}
    />
    </>
  );
}
