/**
 * Production / post-deploy seed: creates (or ensures) a single SUPERADMIN account.
 *
 * Required env:
 *   SEED_SUPERADMIN_EMAIL
 *   SEED_SUPERADMIN_PASSWORD
 * Optional:
 *   SEED_SUPERADMIN_NAME
 *   SEED_SUPERADMIN_RESET_PASSWORD=true  — update password if the user already exists
 *
 * Usage after deploy:
 *   npx prisma db push
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function env(name) {
  const raw = process.env[name];
  if (raw == null) return "";
  return String(raw).trim().replace(/^["']|["']$/g, "");
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function ensureSuperadminRole(userId) {
  const existing = await prisma.userRole.findFirst({
    where: { userId, role: "SUPERADMIN", conferenceId: null },
  });
  if (!existing) {
    await prisma.userRole.create({
      data: { userId, role: "SUPERADMIN", conferenceId: null },
    });
  }
}

async function main() {
  const email = env("SEED_SUPERADMIN_EMAIL").toLowerCase();
  const password = env("SEED_SUPERADMIN_PASSWORD");
  const name = env("SEED_SUPERADMIN_NAME") || "System Super Admin";
  const resetPassword = env("SEED_SUPERADMIN_RESET_PASSWORD").toLowerCase() === "true";

  if (!email || !password) {
    console.error(
      "Missing SEED_SUPERADMIN_EMAIL or SEED_SUPERADMIN_PASSWORD in the environment.",
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("SEED_SUPERADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    /** @type {Record<string, unknown>} */
    const update = { name };
    if (resetPassword) {
      update.passwordHash = await hashPassword(password);
      update.mustChangePassword = true;
    }
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: update,
    });
    await ensureSuperadminRole(user.id);
    console.log(
      resetPassword
        ? `Updated super admin ${email} (password reset; must change on next login).`
        : `Super admin ${email} already exists; SUPERADMIN role ensured. Password unchanged (set SEED_SUPERADMIN_RESET_PASSWORD=true to reset).`,
    );
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    },
  });
  await ensureSuperadminRole(user.id);
  console.log(
    `Created super admin ${email}. They must change password on first login.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
