import type { PrismaClient } from '../../shared/database/prisma.js';
import type { AppLogger } from '../../shared/logger/logger.js';
import type { AppConfig } from '../../config/env.js';
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '../../shared/errors/app-error.js';
import { hashPassword, verifyPassword } from './password.js';
import { generateResetToken, hashResetToken } from './tokens.js';
import type { PasswordResetDelivery } from './delivery.js';
import {
  registerSchema,
  loginSchema,
  resetRequestSchema,
  resetConsumeSchema,
} from './schemas.js';

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isActive: boolean;
};

export type AuthService = {
  register: (
    input: unknown,
  ) => Promise<{ id: string; email: string; name: string; role: string }>;
  login: (input: unknown) => Promise<AuthedUser>;
  requestPasswordReset: (input: unknown) => Promise<void>;
  consumePasswordReset: (input: unknown) => Promise<void>;
  loadUser: (id: string) => Promise<AuthedUser | null>;
  destroySessionsForUser: (userId: string) => Promise<void>;
};

export function createAuthService(
  prisma: PrismaClient,
  config: AppConfig,
  logger: AppLogger,
  delivery: PasswordResetDelivery,
): AuthService {
  async function loadUser(id: string): Promise<AuthedUser | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthedUser['role'],
      isActive: user.isActive,
    };
  }

  return {
    async register(input: unknown) {
      const parsed = registerSchema.safeParse(input);
      if (!parsed.success)
        throw new ValidationError('Request validation failed', parsed.error.issues);
      const data = parsed.data;
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new ConflictError('An account with this email already exists');
      const passwordHash = hashPassword(data.password);
      const user = await prisma.user.create({
        data: { email: data.email, name: data.name, passwordHash, role: 'STUDENT' },
      });
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },

    async login(input: unknown) {
      const parsed = loginSchema.safeParse(input);
      if (!parsed.success)
        throw new ValidationError('Request validation failed', parsed.error.issues);
      const data = parsed.data;
      const user = await prisma.user.findUnique({ where: { email: data.email } });
      const dummyHash = hashPassword('dummy-password-for-timing-safety');
      const hashToCheck = user?.passwordHash ?? dummyHash;
      const ok = verifyPassword(data.password, hashToCheck);
      if (!user || !ok) throw new UnauthorizedError('Invalid email or password');
      if (!user.isActive) throw new UnauthorizedError('Account is disabled');
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as AuthedUser['role'],
        isActive: user.isActive,
      };
    },

    async requestPasswordReset(input: unknown) {
      const parsed = resetRequestSchema.safeParse(input);
      if (!parsed.success)
        throw new ValidationError('Request validation failed', parsed.error.issues);
      const data = parsed.data;
      const user = await prisma.user.findUnique({ where: { email: data.email } });
      if (!user || !user.isActive) return;
      const { raw, hash } = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hash, expiresAt },
      });
      const resetUrl = `${config.allowedOrigins[0] ?? ''}/reset-password?token=${raw}`;
      await delivery.send(user.email, resetUrl, raw);
      logger.info({ userId: user.id }, 'Password reset token issued');
    },

    async consumePasswordReset(input: unknown) {
      const parsed = resetConsumeSchema.safeParse(input);
      if (!parsed.success)
        throw new ValidationError('Request validation failed', parsed.error.issues);
      const data = parsed.data;
      const tokenHash = hashResetToken(data.token);
      const record = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (!record || record.usedAt || record.expiresAt < new Date())
        throw new AppError('BAD_REQUEST', 'Invalid or expired reset token');
      if (!record.user.isActive) throw new UnauthorizedError('Account is disabled');
      const passwordHash = hashPassword(data.password);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
        await tx.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });
        await tx.passwordResetToken.updateMany({
          where: { userId: record.userId, usedAt: null, id: { not: record.id } },
          data: { usedAt: new Date() },
        });
      });
      await this.destroySessionsForUser(record.userId);
    },

    loadUser,

    async destroySessionsForUser(userId: string) {
      await prisma.$executeRaw`DELETE FROM "session" WHERE (sess->>'userId') = ${userId}`;
    },
  };
}
