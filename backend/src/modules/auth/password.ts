import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing using Node's built-in scrypt (no native dependency).
 *
 * Stored format: `scrypt$N$r$p$salt$hash` (all base64). Parameters are
 * embedded so they can be tuned later without breaking existing hashes.
 */
const N = 1 << 15; // 32768
const r = 8;
const p = 1;
const keyLen = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, keyLen, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }
  const n = Number(parts[1]);
  const rr = Number(parts[2]);
  const pp = Number(parts[3]);
  if (!Number.isFinite(n) || !Number.isFinite(rr) || !Number.isFinite(pp)) {
    return false;
  }
  const saltPart = parts[4];
  const hashPart = parts[5];
  if (saltPart === undefined || hashPart === undefined) {
    return false;
  }
  let salt: Buffer;
  let hash: Buffer;
  try {
    salt = Buffer.from(saltPart, 'base64');
    hash = Buffer.from(hashPart, 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || hash.length === 0) {
    return false;
  }
  let derived: Buffer;
  try {
    derived = scryptSync(password, salt, hash.length, {
      N: n,
      r: rr,
      p: pp,
      maxmem: 64 * 1024 * 1024,
    });
  } catch {
    return false;
  }
  if (derived.length !== hash.length) {
    return false;
  }
  return timingSafeEqual(derived, hash);
}
