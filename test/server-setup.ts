import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

// Point the server at scratch storage before anything imports config, the
// Sequelize instance, or storage.ts. Each test file gets its own directory, so
// suites cannot see each other's rows or files, and the developer's real
// database.sqlite is never touched.
const scratch = mkdtempSync(join(tmpdir(), 'dreamoff-test-'));

process.env.DATABASE_PATH = join(scratch, 'test.sqlite');
process.env.UPLOADS_PATH = join(scratch, 'uploads');

// config.ts exits the process when these are missing. dotenv does not override
// variables that are already set, so these win over whatever is in server/.env
// and the suite does not depend on a developer's local configuration.
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';

// The suite registers and logs in dozens of times; the limiter has its own
// dedicated test that builds a limiter with a small budget.
process.env.AUTH_RATE_LIMIT_MAX = '100000';

afterAll(async () => {
    // Windows keeps the .sqlite file locked until the connection is closed, so
    // release it before deleting. Only close what the suite actually opened.
    try {
        const db = await import('../server/models/db.js');
        await db.default.close();
    } catch {
        // Suite never touched the database; nothing to close.
    }

    // Retries cover the brief window where Windows still reports the handle as
    // in use. A leftover temp directory is harmless, so never fail the run.
    try {
        rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch {
        // The OS cleans its own temp directory eventually.
    }
});
