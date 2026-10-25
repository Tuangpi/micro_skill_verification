import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  const hash = hashResetToken(raw);
  return { raw, hash };
}

export function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function safeEqualHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length === 0 || ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
