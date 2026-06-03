import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export async function hashAccessKey(key) {
  return bcrypt.hash(key, ROUNDS);
}

export async function verifyAccessKey(key, hash) {
  return bcrypt.compare(key, hash);
}
