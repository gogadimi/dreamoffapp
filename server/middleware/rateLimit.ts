// Rate limiting for the credential endpoints.
//
// /login and /register were previously unthrottled, so an attacker could try
// passwords as fast as the network allowed. bcrypt makes each attempt costly
// for the server too, which turns the same endpoint into a cheap way to burn
// CPU.

import rateLimit, { Options } from 'express-rate-limit';
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } from '../config.js';

/**
 * Exported as a factory so tests can build a limiter with a small budget and
 * exercise the real middleware rather than a stand-in.
 */
export function createAuthLimiter(overrides: Partial<Options> = {}) {
    return rateLimit({
        windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
        limit: AUTH_RATE_LIMIT_MAX,
        // Draft-8 RateLimit headers; the deprecated X-RateLimit-* set is off.
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        // Successful sign-ins should not count towards the budget, so a busy
        // legitimate user is never locked out by their own activity.
        skipSuccessfulRequests: true,
        message: { error: 'Too many attempts. Please try again later.' },
        ...overrides
    });
}

export const authLimiter = createAuthLimiter();
