import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthLimiter } from './rateLimit.js';

/**
 * Builds a throwaway app around the real limiter with a small budget. The
 * suite's own fixtures run with a very high limit (see test/server-setup.ts),
 * so this is where the throttling behaviour is actually exercised.
 */
function appWithLimit(limit: number, extra: Record<string, unknown> = {}) {
    const app = express();
    app.use(express.json());
    app.post(
        '/login',
        createAuthLimiter({ limit, windowMs: 60_000, ...extra }),
        (req, res) => {
            if (req.body?.password === 'correct') {
                res.json({ token: 'ok' });
                return;
            }
            res.status(401).json({ error: 'Invalid credentials.' });
        }
    );
    return app;
}

const attempt = (app: express.Express, password = 'wrong') =>
    request(app).post('/login').send({ email: 'a@test.local', password });

describe('auth rate limiter', () => {
    it('allows attempts up to the limit', async () => {
        const app = appWithLimit(3);
        for (let i = 0; i < 3; i++) {
            expect((await attempt(app)).status).toBe(401);
        }
    });

    it('returns 429 once the budget is spent', async () => {
        const app = appWithLimit(3);
        for (let i = 0; i < 3; i++) await attempt(app);

        const blocked = await attempt(app);
        expect(blocked.status).toBe(429);
        expect(blocked.body.error).toMatch(/too many attempts/i);
    });

    it('keeps refusing after the limit is passed', async () => {
        const app = appWithLimit(1);
        await attempt(app);
        expect((await attempt(app)).status).toBe(429);
        expect((await attempt(app)).status).toBe(429);
    });

    // A person who signs in successfully should never be throttled by their
    // own activity; only failures burn the budget.
    it('does not count successful sign-ins', async () => {
        const app = appWithLimit(2);
        for (let i = 0; i < 5; i++) {
            expect((await attempt(app, 'correct')).status).toBe(200);
        }
        expect((await attempt(app, 'correct')).status).toBe(200);
    });

    it('still throttles failures mixed in with successes', async () => {
        const app = appWithLimit(2);
        await attempt(app, 'correct');
        await attempt(app);
        await attempt(app, 'correct');
        await attempt(app);

        expect((await attempt(app)).status).toBe(429);
    });

    it('advertises the limit with standard headers', async () => {
        const app = appWithLimit(5);
        const res = await attempt(app);

        expect(res.headers['ratelimit']).toBeDefined();
        // The deprecated X-RateLimit-* set is deliberately off.
        expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    });
});
