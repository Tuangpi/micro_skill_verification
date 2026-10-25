import type { AppLogger } from '../../shared/logger/logger.js';

export interface PasswordResetDelivery {
  send(email: string, resetUrl: string, token: string): Promise<void>;
}

/**
 * Development/test delivery: logs the reset token. NEVER use in production.
 * The token is logged only when NODE_ENV !== 'production'.
 */
export function createConsoleDelivery(
  logger: AppLogger,
  isProduction: boolean,
): PasswordResetDelivery {
  return {
    async send(email, resetUrl, token) {
      if (isProduction) {
        // Production requires a real provider; this is a gate, not an implementation.
        logger.warn(
          { email },
          'Password reset requested but no delivery provider is configured',
        );
        return;
      }
      logger.info({ email, resetUrl, token }, 'Password reset token (development only)');
    },
  };
}
