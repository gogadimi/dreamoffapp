// Centralised, validated configuration.
//
// Everything the server cannot run correctly without is resolved here, at
// import time, so a misconfigured deploy dies immediately with a clear message
// instead of surfacing as a confusing 500 on the first login attempt.

import 'dotenv/config';

// Values shipped in .env.example. Present in a real .env they mean the operator
// copied the template and never filled it in — treat as missing, not as a value.
const PLACEHOLDERS = new Set([
    'your_strong_random_secret_here',
    'your_gemini_api_key_here',
    'your_huggingface_api_key_here',
    'changeme'
]);

const problems: string[] = [];

function required(name: string, hint: string): string {
    const raw = process.env[name]?.trim();
    if (!raw) {
        problems.push(`  • ${name} is missing. ${hint}`);
        return '';
    }
    if (PLACEHOLDERS.has(raw)) {
        problems.push(`  • ${name} is still the placeholder from .env.example. ${hint}`);
        return '';
    }
    return raw;
}

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const PORT = Number(process.env.PORT) || 5000;

export const JWT_SECRET = required(
    'JWT_SECRET',
    'Generate one with:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
);

// jsonwebtoken accepts a number of seconds or an ms-style string ("7d", "12h").
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN?.trim() || '7d') as `${number}${'d' | 'h' | 'm' | 's'}`;

// A short secret is technically valid but not worth shipping — warn, don't block.
if (JWT_SECRET && JWT_SECRET.length < 32) {
    console.warn(`[DreamOff] Warning: JWT_SECRET is only ${JWT_SECRET.length} characters. 32+ is recommended.`);
}

if (problems.length > 0) {
    console.error(
        `\n[DreamOff] Cannot start — invalid configuration in server/.env:\n\n${problems.join('\n')}\n`
    );
    process.exit(1);
}

// AI keys are optional: the server runs fine without them, and the /api/ai
// routes already return a clear 500 when they are absent.
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || '';
export const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY?.trim() || '';
