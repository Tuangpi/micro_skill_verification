import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

/**
 * Test bootstrap.
 *
 * The test suite always runs against the dedicated `micro_skill_test`
 * database. Loading `.env.test` before the suite starts keeps test
 * configuration explicit and prevents accidental use of development data.
 */
loadDotenv({ path: resolve(process.cwd(), '.env.test') });
loadDotenv({ path: resolve(process.cwd(), '.env') });
