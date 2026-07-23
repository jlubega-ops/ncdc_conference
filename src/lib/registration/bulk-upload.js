import { prisma } from "@/lib/prisma";
import { buildProfilePayload } from "@/lib/users/profile";
import { issueAndEmailAccessKey } from "@/lib/registration/access-key-issue";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * CSV template header for admin attendee upload.
 * Required: email, firstName, lastName.
 * Optional: middleName, gender, telephone, countryOfOrigin, institution.
 */
export const ATTENDEE_UPLOAD_HEADERS = [
  "email",
  "firstName",
  "middleName",
  "lastName",
  "gender",
  "telephone",
  "countryOfOrigin",
  "institution",
];

export function getAttendeeUploadTemplateCsv() {
  return `${ATTENDEE_UPLOAD_HEADERS.join(",")}\n`;
}

/**
 * Parse CSV text into rows (simple comma-separated; supports quoted fields lightly).
 * @param {string} text
 */
export function parseAttendeeCsv(text) {
  const lines = String(text ?? "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line, index) => {
    const cols = splitCsvLine(line);
    /** @type {Record<string, string>} */
    const obj = { _line: String(index + 2) };
    headers.forEach((h, i) => {
      obj[h] = (cols[i] ?? "").trim();
    });
    return obj;
  });

  return { headers, rows };
}

/**
 * @param {string} line
 */
function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

/**
 * @param {Record<string, string>} row
 * @param {string[]} keys
 */
function pickField(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

/**
 * Validate preview rows before confirm upload.
 * @param {Array<Record<string, string>>} rows
 */
export function validateAttendeeUploadRows(rows) {
  const emailCounts = new Map();
  for (const row of rows) {
    const email = String(row.email ?? "")
      .trim()
      .toLowerCase();
    if (!email) continue;
    emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
  }

  return rows.map((row) => {
    const email = String(row.email ?? "")
      .trim()
      .toLowerCase();
    const firstName = pickField(row, ["firstname", "firstName"]);
    const middleName = pickField(row, ["middlename", "middleName"]);
    const lastName = pickField(row, ["lastname", "lastName"]);
    const genderRaw = pickField(row, ["gender"]).toUpperCase();
    const gender = genderRaw === "M" || genderRaw === "F" ? genderRaw : "";
    const telephone = pickField(row, ["telephone", "phone", "tel", "mobile"]);
    const countryOfOrigin = pickField(row, [
      "countryoforigin",
      "country_of_origin",
      "country",
      "countryOfOrigin",
    ]);
    const institution = pickField(row, ["institution", "organization", "organisation"]);

    /** @type {string[]} */
    const errors = [];

    if (!email) errors.push("Email is required.");
    else if (!EMAIL_RE.test(email)) errors.push("Invalid email address.");
    else if ((emailCounts.get(email) || 0) > 1) errors.push("Duplicate email in file.");

    if (!firstName) errors.push("First name is required.");
    if (!lastName) errors.push("Last name is required.");
    if (firstName && !/^[a-zA-Z][a-zA-Z\s'-]*$/.test(firstName)) {
      errors.push("First name contains invalid characters.");
    }
    if (middleName && !/^[a-zA-Z][a-zA-Z\s'-]*$/.test(middleName)) {
      errors.push("Middle name contains invalid characters.");
    }
    if (lastName && !/^[a-zA-Z][a-zA-Z\s'-]*$/.test(lastName)) {
      errors.push("Last name contains invalid characters.");
    }
    if (genderRaw && !gender) errors.push("Gender must be M or F (or leave blank).");

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

    return {
      line: Number(row._line) || null,
      email,
      firstName,
      middleName: middleName || null,
      lastName,
      gender,
      telephone: telephone || null,
      countryOfOrigin: countryOfOrigin || null,
      institution: institution || null,
      fullName,
      errors,
      valid: errors.length === 0,
    };
  });
}

/**
 * Upload attendees for ADMIN_UPLOAD conferences (CONFIRMED + access key email).
 * @param {{ conferenceId: string; rows: ReturnType<typeof validateAttendeeUploadRows>; allowErrors?: boolean }} params
 */
export async function confirmAttendeeUpload({ conferenceId, rows, allowErrors = true }) {
  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) throw new Error("Conference not found.");
  if (conference.registrationMode !== "ADMIN_UPLOAD") {
    throw new Error("Attendee upload is only available when registration mode is Admin uploads list.");
  }

  const toProcess = allowErrors
    ? rows.filter((r) => r.email && EMAIL_RE.test(r.email))
    : rows.filter((r) => r.valid);

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    emailed: 0,
    errors: /** @type {Array<{ email: string; message: string }>} */ ([]),
  };

  for (const row of toProcess) {
    try {
      if (!row.email || !EMAIL_RE.test(row.email)) {
        results.skipped += 1;
        continue;
      }

      const profile = buildProfilePayload({
        firstName: row.firstName || "Attendee",
        middleName: row.middleName,
        lastName: row.lastName || "User",
        gender: row.gender || "",
        telephone: row.telephone || "",
        countryOfOrigin: row.countryOfOrigin || "",
        institution: row.institution || "",
      });

      const formData = {
        ...profile,
        email: row.email,
      };

      let user = await prisma.user.findUnique({
        where: { email: row.email },
        include: { roles: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: row.email,
            name: profile.fullName,
            profileData: profile,
            passwordHash: null,
            mustChangePassword: false,
            roles: {
              create: { role: "ATTENDEE", conferenceId },
            },
          },
          include: { roles: true },
        });
        results.created += 1;
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            name: profile.fullName || user.name,
            profileData: profile,
          },
        });
        const hasRole = user.roles.some(
          (r) => r.role === "ATTENDEE" && r.conferenceId === conferenceId,
        );
        if (!hasRole) {
          await prisma.userRole.create({
            data: { userId: user.id, role: "ATTENDEE", conferenceId },
          });
        }
        results.updated += 1;
      }

      const existingReg = await prisma.conferenceRegistration.findUnique({
        where: {
          conferenceId_userId: { conferenceId, userId: user.id },
        },
      });

      if (existingReg) {
        await prisma.conferenceRegistration.update({
          where: { id: existingReg.id },
          data: {
            status: "CONFIRMED",
            formData,
            reviewedAt: new Date(),
          },
        });
      } else {
        await prisma.conferenceRegistration.create({
          data: {
            conferenceId,
            userId: user.id,
            status: "CONFIRMED",
            formData,
            reviewedAt: new Date(),
          },
        });
      }

      const keyResult = await issueAndEmailAccessKey({
        user,
        conference,
      });
      if (keyResult.emailSent) results.emailed += 1;
    } catch (err) {
      results.errors.push({
        email: row.email,
        message: err instanceof Error ? err.message : "Upload failed for this row.",
      });
    }
  }

  return results;
}
