import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { initDB } from '../models/db.js';
import { syncDB } from '../models/index.js';

beforeAll(async () => {
    await initDB();
    await syncDB();
});

const credentials = (email: string) => ({ name: 'Dreamer', email, password: 'secret123' });

describe('POST /api/auth/register', () => {
    it('creates an account and returns a usable token', async () => {
        const res = await request(app).post('/api/auth/register').send(credentials('new@test.local'));

        expect(res.status).toBe(201);
        expect(res.body.user).toEqual({
            email: 'new@test.local',
            name: 'Dreamer',
            createdAt: expect.any(String)
        });

        // Regression: public class fields shadowed Sequelize's getters, so this
        // object came back empty and every field read as undefined.
        expect(res.body.user.email).toBeDefined();
        expect(typeof res.body.token).toBe('string');
    });

    it('never returns the password hash', async () => {
        const res = await request(app).post('/api/auth/register').send(credentials('nohash@test.local'));
        expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
        expect(res.body.user).not.toHaveProperty('password');
    });

    it('issues a token the auth middleware accepts', async () => {
        const res = await request(app).post('/api/auth/register').send(credentials('tok@test.local'));
        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET!) as { email: string };
        expect(decoded.email).toBe('tok@test.local');
    });

    it('lowercases the stored email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...credentials('MiXeD@Test.Local'), email: 'MiXeD@Test.Local' });
        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe('mixed@test.local');

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: 'mixed@test.local', password: 'secret123' });
        expect(login.status).toBe(200);
    });

    it('rejects a duplicate email with 409', async () => {
        await request(app).post('/api/auth/register').send(credentials('dupe@test.local'));
        const again = await request(app).post('/api/auth/register').send(credentials('dupe@test.local'));

        expect(again.status).toBe(409);
        expect(again.body.error).toMatch(/already exists/i);
    });

    it.each([
        ['missing name', { email: 'a@test.local', password: 'secret123' }, /required/i],
        ['missing email', { name: 'A', password: 'secret123' }, /required/i],
        ['missing password', { name: 'A', email: 'a@test.local' }, /required/i],
        ['short password', { name: 'A', email: 'a@test.local', password: '12345' }, /6 characters/i],
        ['malformed email', { name: 'A', email: 'not-an-email', password: 'secret123' }, /invalid email/i]
    ])('rejects %s with 400', async (_label, body, message) => {
        const res = await request(app).post('/api/auth/register').send(body);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(message);
    });
});

describe('POST /api/auth/login', () => {
    beforeAll(async () => {
        await request(app).post('/api/auth/register').send(credentials('login@test.local'));
    });

    it('accepts the right password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'login@test.local', password: 'secret123' });

        expect(res.status).toBe(200);
        expect(res.body.user.name).toBe('Dreamer');
        expect(typeof res.body.token).toBe('string');
    });

    it('rejects the wrong password with 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'login@test.local', password: 'wrong-password' });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/invalid credentials/i);
    });

    it('gives the same answer for an unknown account, revealing nothing', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'ghost@test.local', password: 'secret123' });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/invalid credentials/i);
    });

    it('requires both fields', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'login@test.local' });
        expect(res.status).toBe(400);
    });
});

describe('GET /api/auth/me', () => {
    let token: string;

    beforeAll(async () => {
        const res = await request(app).post('/api/auth/register').send(credentials('me@test.local'));
        token = res.body.token;
    });

    it('returns the current profile for a valid token', async () => {
        const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('me@test.local');
        expect(res.body.user).not.toHaveProperty('password');
    });

    it('rejects a request with no token', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/no token/i);
    });

    it('rejects a malformed token', async () => {
        const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage');
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/invalid or expired/i);
    });

    it('rejects a token signed with a different secret', async () => {
        const forged = jwt.sign({ email: 'me@test.local', name: 'Dreamer' }, 'not-the-real-secret');
        const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
        expect(res.status).toBe(401);
    });

    it('rejects an expired token', async () => {
        const expired = jwt.sign(
            { email: 'me@test.local', name: 'Dreamer' },
            process.env.JWT_SECRET!,
            { expiresIn: '-1s' }
        );
        const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/invalid or expired/i);
    });
});

// ── Interop guard ──
//
// These assertions read source rather than exercise behaviour, on purpose.
// Vitest runs server code through Vite, which inserts CommonJS/ESM interop
// shims that Node's native loader and tsx do not. The original
// "bcrypt.hash is not a function" defect therefore does NOT reproduce under
// this suite: every test above passes even with the broken namespace import.
//
// Until the server suite runs on Node's own loader, this is the only thing
// standing between that bug and a second appearance.
describe('CommonJS interop (source-level guard)', () => {
    const authSource = readFileSync(
        fileURLToPath(new URL('./auth.ts', import.meta.url)),
        'utf8'
    );

    it('imports bcryptjs as a default import, not a namespace', () => {
        expect(authSource).toMatch(/^import bcrypt from 'bcryptjs';$/m);
        expect(
            authSource,
            'bcryptjs is CommonJS: a namespace import leaves bcrypt.hash undefined under Node ESM'
        ).not.toMatch(/import * as bcrypt from 'bcryptjs'/);
    });
});
