/**
 * Canonical activity action keys for the system audit log.
 * Keep descriptions human-readable at the call site.
 */
export const ACTIVITY_ACTIONS = {
  // Auth
  AUTH_LOGIN: "auth.login",
  AUTH_LOGIN_FAILED: "auth.login_failed",
  AUTH_LOGOUT: "auth.logout",
  AUTH_SIGNUP: "auth.signup",
  AUTH_ACCESS_KEY: "auth.access_key_login",
  AUTH_ACCESS_KEY_FAILED: "auth.access_key_login_failed",
  AUTH_SWITCH_ROLE: "auth.switch_role",
  AUTH_CHANGE_PASSWORD: "auth.change_password",
  AUTH_FORGOT_PASSWORD: "auth.forgot_password",
  AUTH_RESET_PASSWORD: "auth.reset_password",

  // Users (superadmin)
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
  USER_RESEND_ACTIVATION: "user.resend_activation",
  USER_RESET_PASSWORD: "user.reset_password",
  USER_ROLE_ASSIGN: "user.role_assign",
  USER_ROLE_REMOVE: "user.role_remove",

  // Conferences
  CONFERENCE_CREATE: "conference.create",
  CONFERENCE_UPDATE: "conference.update",
  CONFERENCE_DELETE: "conference.delete",
  CONFERENCE_DUPLICATE: "conference.duplicate",
  CONFERENCE_SPEAKERS_UPDATE: "conference.speakers_update",
  CONFERENCE_ADMIN_ASSIGN: "conference.admin_assign",
  CONFERENCE_ADMIN_REMOVE: "conference.admin_remove",

  // Content
  RESOURCE_CREATE: "resource.create",
  RESOURCE_UPDATE: "resource.update",
  RESOURCE_DELETE: "resource.delete",
  PRESENTATION_CREATE: "presentation.create",
  PRESENTATION_DELETE: "presentation.delete",
  UPLOAD_CARD_IMAGE: "upload.card_image",
  UPLOAD_ORGANISER_LOGO: "upload.organiser_logo",
  UPLOAD_SPEAKER_PHOTO: "upload.speaker_photo",

  // Registrations & attendees
  REGISTRATION_CREATE: "registration.create",
  REGISTRATION_UPDATE: "registration.update",
  REGISTRATION_DELETE: "registration.delete",
  REGISTRATION_APPROVE: "registration.approve",
  REGISTRATION_REQUEST_REVISION: "registration.request_revision",
  REGISTRATION_REJECT: "registration.reject",
  REGISTRATION_ACTIVATE: "registration.activate",
  REGISTRATION_RESEND_ACCESS: "registration.resend_access",
  REGISTRATION_BULK_SEND_ACCESS: "registration.bulk_send_access",
  REGISTRATION_ADD_ATTENDEE: "registration.add_attendee",
  REGISTRATION_ASSIGN_REPRESENTATIVE: "registration.assign_representative",
  ATTENDEES_UPLOAD: "attendees.upload",

  // Attendance
  ATTENDANCE_MARK: "attendance.mark",
  ATTENDANCE_UPDATE: "attendance.update",
  ATTENDANCE_CLEAR: "attendance.clear",
  ATTENDANCE_CHECK_IN: "attendance.check_in",

  // Papers
  PAPER_SUBMIT: "paper.submit",
  PAPER_RESUBMIT: "paper.resubmit",
  PAPER_ASSIGN_REVIEWER: "paper.assign_reviewer",
  PAPER_REVIEW: "paper.review",
  PAPER_READ_FEEDBACK: "paper.read_feedback",

  // Gifts
  GIFT_ISSUE: "gift.issue",

  // Email queue
  EMAIL_QUEUE_ENQUEUE: "email_queue.enqueue",
  EMAIL_QUEUE_PROCESS: "email_queue.process",

  // Feedback / certificates / profile
  FEEDBACK_SUBMIT: "feedback.submit",
  CERTIFICATE_EMAIL: "certificate.email",
  PROFILE_UPDATE: "profile.update",
};
