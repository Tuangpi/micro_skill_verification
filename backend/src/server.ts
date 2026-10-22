import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createPrismaClient } from './shared/database/prisma.js';
import { createLogger } from './shared/logger/logger.js';

/**
 * Process entry point.
 *
 * Configuration is validated before anything else starts so that a missing or
 * invalid environment variable fails the boot immediately.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  const prisma = createPrismaClient(config);

  const app = createApp({ config, logger, prisma });

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, apiPrefix: config.apiPrefix, env: config.nodeEnv },
      'API server listening',
    );
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'Shutting down API server');
    server.close(() => {
      void prisma.$disconnect().finally(() => {
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
  });
}

main().catch((error: unknown) => {
  // The logger may not exist yet when configuration validation fails.
  console.error('Failed to start API server:', error);
  process.exit(1);
});
