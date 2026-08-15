import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateTemporaryPassword } from "@/lib/auth/credentials";
import { sendEmail } from "@/lib/email/mailer";
import {
  paperApprovedEmail,
  paperRevisionEmail,
  paperReviewerAssignedEmail,
  registrationWelcomeEmail,
} from "@/lib/email/templates";
import { getPaperFileRef, mapPaperForAdmin } from "@/lib/papers/map";
import { savePrivateUpload } from "@/lib/storage/secure-files";
import { emailBrandFromConference } from "@/lib/conferences/brand";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * @param {unknown} log
 * @param {Record<string, unknown>} entry
 */
function appendActivity(log, entry) {
  const arr = Array.isArray(log) ? log : [];
  return [...arr, { at: new Date().toISOString(), ...entry }];
}

/**
 * @param {string} conferenceId
 * @param {string} submissionId
 */
export async function getPaperSubmissionOrThrow(conferenceId, submissionId) {
  const row = await prisma.paperSubmission.findFirst({
    where: { id: submissionId, conferenceId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      conference: {
        select: {
          id: true,
          slug: true,
          title: true,
          organiserName: true,
          organiserShortName: true,
          organiserLogo: true,
        },
      },
      assignedReviewer: { select: { id: true, email: true, name: true } },
    },
  });
  if (!row) throw new Error("Paper submission not found.");
  return row;
}

/**
 * @param {object} params
 */
export async function reviewPaperSubmission({
  conferenceId,
  submissionId,
  reviewerId,
  action,
  reviewNotes,
  improvementRequest,
}) {
  const paper = await getPaperSubmissionOrThrow(conferenceId, submissionId);
  const authorName = paper.user.name || paper.user.email;
  const conferenceTitle = paper.conference.title;

  let status = paper.status;
  let isFinalApproved = paper.isFinalApproved;
  let nextImprovement = paper.improvementRequest;
  const log = appendActivity(paper.activityLog, {
    type: "review",
    action,
    by: reviewerId,
    reviewNotes: reviewNotes?.trim() || null,
    improvementRequest: improvementRequest?.trim() || null,
  });

  if (action === "approve") {
    status = "ACCEPTED";
    isFinalApproved = true;
    nextImprovement = null;
  } else if (action === "request_revision") {
    if (!improvementRequest?.trim()) {
      throw new Error("Describe what the author should improve.");
    }
    status = "NEEDS_REVISION";
    isFinalApproved = false;
    nextImprovement = improvementRequest.trim();
  } else if (action === "reject") {
    status = "REJECTED";
    isFinalApproved = false;
    nextImprovement = null;
  } else {
    throw new Error("Invalid review action.");
  }

  const updated = await prisma.paperSubmission.update({
    where: { id: submissionId },
    data: {
      status,
      isFinalApproved,
      improvementRequest: nextImprovement,
      reviewNotes: reviewNotes?.trim() || null,
      reviewedAt: new Date(),
      reviewedById: reviewerId,
      authorHasUnreadFeedback: true,
      activityLog: log,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      assignedReviewer: { select: { id: true, email: true, name: true } },
    },
  });

  if (action === "approve") {
    await sendEmail({
      to: paper.user.email,
      ...paperApprovedEmail({
        name: authorName,
        conferenceTitle,
        paperTitle: paper.title,
        notes: reviewNotes?.trim(),
        isFinal: true,
        brand: emailBrandFromConference(paper.conference),
      }),
    });
  } else if (action === "request_revision") {
    await sendEmail({
      to: paper.user.email,
      ...paperRevisionEmail({
        name: authorName,
        conferenceTitle,
        paperTitle: paper.title,
        improvementRequest: nextImprovement,
        notes: reviewNotes?.trim(),
        brand: emailBrandFromConference(paper.conference),
      }),
    });
  }

  return mapPaperForAdmin(updated);
}

/**
 * @param {object} params
 */
export async function assignPaperReviewer({
  conferenceId,
  submissionId,
  assignerId,
  userId,
  mode,
  email,
  name,
}) {
  const paper = await getPaperSubmissionOrThrow(conferenceId, submissionId);
  let reviewerUserId = userId?.trim();
  let createdNew = false;
  let tempPassword = null;

  if (mode === "new") {
    const normalizedEmail = (email ?? "").trim().toLowerCase();
    const displayName = (name ?? "").trim() || null;
    if (!normalizedEmail) throw new Error("Reviewer email is required.");

    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user && paper.assignedReviewerId === user.id) {
      throw new Error("This reviewer is already assigned to this paper.");
    }
    if (!user) {
      tempPassword = generateTemporaryPassword();
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          passwordHash: await hashPassword(tempPassword),
          mustChangePassword: true,
        },
      });
      createdNew = true;
      await sendEmail({
        to: normalizedEmail,
        ...registrationWelcomeEmail({
          name: displayName || normalizedEmail,
          email: normalizedEmail,
          password: tempPassword,
          conferenceTitle: `${paper.conference.title} (reviewer)`,
          brand: emailBrandFromConference(paper.conference),
        }),
      });
      await sendEmail({
        to: normalizedEmail,
        ...paperReviewerAssignedEmail({
          name: displayName || normalizedEmail,
          conferenceTitle: paper.conference.title,
          paperTitle: paper.title,
          brand: emailBrandFromConference(paper.conference),
        }),
      });
    }
    reviewerUserId = user.id;
  }

  if (!reviewerUserId) throw new Error("Reviewer is required.");

  if (paper.assignedReviewerId && paper.assignedReviewerId === reviewerUserId) {
    throw new Error("This reviewer is already assigned to this paper.");
  }

  const reviewer = await prisma.user.findUnique({
    where: { id: reviewerUserId },
    select: { id: true, email: true, name: true },
  });
  if (!reviewer) throw new Error("Reviewer user not found.");

  await prisma.userRole.upsert({
    where: {
      userId_role_conferenceId: {
        userId: reviewerUserId,
        role: "REVIEWER",
        conferenceId,
      },
    },
    create: {
      userId: reviewerUserId,
      role: "REVIEWER",
      conferenceId,
    },
    update: {},
  });

  const log = appendActivity(paper.activityLog, {
    type: "assigned_reviewer",
    by: assignerId,
    reviewerId: reviewer.id,
    reviewerEmail: reviewer.email,
    createdNew,
  });

  const nextStatus =
    paper.status === "SUBMITTED" || paper.status === "NEEDS_REVISION"
      ? "UNDER_REVIEW"
      : paper.status;

  const updated = await prisma.paperSubmission.update({
    where: { id: submissionId },
    data: {
      assignedReviewerId: reviewer.id,
      status: nextStatus,
      activityLog: log,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      assignedReviewer: { select: { id: true, email: true, name: true } },
    },
  });

  if (!createdNew) {
    await sendEmail({
      to: reviewer.email,
      ...paperReviewerAssignedEmail({
        name: reviewer.name || reviewer.email,
        conferenceTitle: paper.conference.title,
        paperTitle: paper.title,
        brand: emailBrandFromConference(paper.conference),
      }),
    });
  }

  return mapPaperForAdmin(updated);
}

/**
 * @param {object} params
 */
export async function resubmitPaper({ paperId, userId, title, abstract, file }) {
  const paper = await prisma.paperSubmission.findFirst({
    where: { id: paperId, userId },
    include: { conference: { select: { slug: true, title: true } } },
  });
  if (!paper) throw new Error("Paper not found.");
  if (paper.status !== "NEEDS_REVISION") {
    throw new Error("This paper is not awaiting a revision.");
  }

  const nextTitle = title?.trim() || paper.title;
  const nextAbstract = abstract?.trim() ?? paper.abstract;

  let nextFileId = getPaperFileRef(paper);
  let previousFileId = nextFileId;

  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error("Upload a PDF or Word document.");
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("File must be 10MB or smaller.");
    }
    nextFileId = await savePrivateUpload(file, "paper-submissions");
  }

  const log = appendActivity(paper.activityLog, {
    type: "resubmit",
    by: userId,
    previousTitle: paper.title !== nextTitle ? paper.title : null,
    titleChanged: paper.title !== nextTitle,
    fileReplaced: Boolean(nextFileId && nextFileId !== previousFileId),
    previousFileId,
    newFileId: nextFileId !== previousFileId ? nextFileId : null,
  });

  const data = {
    title: nextTitle,
    abstract: nextAbstract || null,
    status: "SUBMITTED",
    improvementRequest: null,
    authorHasUnreadFeedback: false,
    isFinalApproved: false,
    submittedAt: new Date(),
    activityLog: log,
  };

  try {
    return await prisma.paperSubmission.update({
      where: { id: paperId },
      data: {
        ...data,
        fileId: nextFileId,
        fileUrl: nextFileId,
      },
    });
  } catch {
    return await prisma.paperSubmission.update({
      where: { id: paperId },
      data: {
        ...data,
        fileUrl: nextFileId,
      },
    });
  }
}

/**
 * @param {string} userId
 */
export async function countUnreadPaperFeedback(userId) {
  return prisma.paperSubmission.count({
    where: {
      userId,
      authorHasUnreadFeedback: true,
    },
  });
}

/**
 * @param {string} paperId
 * @param {string} userId
 */
export async function markPaperFeedbackRead(paperId, userId) {
  await prisma.paperSubmission.updateMany({
    where: { id: paperId, userId },
    data: { authorHasUnreadFeedback: false },
  });
}
