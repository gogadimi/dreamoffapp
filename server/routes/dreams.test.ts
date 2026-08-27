import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import app from '../app.js';
import { initDB } from '../models/db.js';
import { migrateDB } from '../models/index.js';
import { saveImage, deleteImage, UPLOADS_DIR } from '../storage.js';

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);

/** The payload AddDreamScreen actually sends after an interpretation. */
const fullDream = {
    text: 'I was flying over a red ocean',
    model: 'jung',
    layout: 'mobile',
    language: 'en',
    transcription: 'I was flying over a red ocean',
    interpretation: {
        summary: 'A dream of freedom',
        symbols: [{ element: 'ocean', meaning: 'the unconscious' }]
    }
};

let alice = '';
let bob = '';

async function register(email: string) {
    const res = await request(app)
        .post('/api/auth/register')
        .send({ name: email.split('@')[0], email, password: 'secret123' });
    return res.body.token as string;
}

beforeAll(async () => {
    await initDB();
    await migrateDB();
    alice = await register('alice@test.local');
    bob = await register('bob@test.local');
});

describe('authentication', () => {
    it.each([
        ['GET', '/api/dreams'],
        ['POST', '/api/dreams'],
        ['DELETE', '/api/dreams/some-id']
    ])('%s %s requires a token', async (method, path) => {
        const res = await request(app)[method.toLowerCase() as 'get'](path);
        expect(res.status).toBe(401);
    });
});

describe('POST /api/dreams', () => {
    // Regression: the Dreams table had no columns for these seven fields, so
    // Sequelize dropped them silently and the interpretation vanished on reload.
    it('persists every field the app sends', async () => {
        const created = await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${alice}`)
            .send(fullDream);

        expect(created.status).toBe(201);
        expect(created.body).toMatchObject(fullDream);

        // The round trip is the part that used to fail.
        const listed = await request(app).get('/api/dreams').set('Authorization', `Bearer ${alice}`);
        const found = listed.body.find((d: { id: string }) => d.id === created.body.id);
        expect(found).toMatchObject(fullDream);
        expect(found.interpretation.symbols[0].element).toBe('ocean');
    });

    it('accepts a dream with no interpretation yet', async () => {
        const res = await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${alice}`)
            .send({ text: 'a bare dream' });

        expect(res.status).toBe(201);
        expect(res.body.text).toBe('a bare dream');
        expect(res.body.interpretation).toBeNull();
    });

    it('returns defaults rather than nulls the UI would render as "undefined"', async () => {
        const res = await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${alice}`)
            .send({ text: 'sparse' });

        expect(res.body.title).toBe('');
        expect(res.body.themes).toEqual([]);
        expect(res.body.chatHistory).toEqual([]);
        expect(res.body.lucid).toBe(false);
    });

    // Regression: the handler used to spread req.body straight into create().
    it('ignores a client-supplied userId', async () => {
        const created = await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${alice}`)
            .send({ text: 'stolen?', userId: '00000000-0000-0000-0000-000000000000' });

        expect(created.status).toBe(201);

        const mine = await request(app).get('/api/dreams').set('Authorization', `Bearer ${alice}`);
        expect(mine.body.some((d: { id: string }) => d.id === created.body.id)).toBe(true);
    });

    it('ignores a client-supplied id and assigns its own', async () => {
        const res = await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${alice}`)
            .send({ text: 'forged id', id: 'definitely-not-a-uuid' });

        expect(res.status).toBe(201);
        expect(res.body.id).not.toBe('definitely-not-a-uuid');
        expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('drops unknown fields instead of storing them', async () => {
        const res = await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${alice}`)
            .send({ text: 'noise', isAdmin: true, sneaky: 'value' });

        expect(res.body).not.toHaveProperty('isAdmin');
        expect(res.body).not.toHaveProperty('sneaky');
    });
});

describe('GET /api/dreams', () => {
    it('returns only the caller’s dreams', async () => {
        await request(app).post('/api/dreams').set('Authorization', `Bearer ${bob}`).send({ text: "bob's dream" });

        const aliceSees = await request(app).get('/api/dreams').set('Authorization', `Bearer ${alice}`);
        expect(aliceSees.body.every((d: { text: string }) => d.text !== "bob's dream")).toBe(true);

        const bobSees = await request(app).get('/api/dreams').set('Authorization', `Bearer ${bob}`);
        expect(bobSees.body.some((d: { text: string }) => d.text === "bob's dream")).toBe(true);
    });

    it('returns newest first', async () => {
        const token = await register('order@test.local');
        for (const date of ['2026-01-01', '2026-06-01', '2026-03-01']) {
            await request(app)
                .post('/api/dreams')
                .set('Authorization', `Bearer ${token}`)
                .send({ text: date, date });
        }

        const res = await request(app).get('/api/dreams').set('Authorization', `Bearer ${token}`);
        expect(res.body.map((d: { text: string }) => d.text)).toEqual(['2026-06-01', '2026-03-01', '2026-01-01']);
    });

    it('returns an empty array for a user with no dreams', async () => {
        const token = await register('empty@test.local');
        const res = await request(app).get('/api/dreams').set('Authorization', `Bearer ${token}`);
        expect(res.body).toEqual([]);
    });

    // Regression: base64 data URIs made a single dream weigh megabytes.
    it('keeps a dream with an image small on the wire', async () => {
        const token = await register('small@test.local');
        const imageUrl = await saveImage(PNG, 'image/png');
        await request(app).post('/api/dreams').set('Authorization', `Bearer ${token}`).send({ ...fullDream, imageUrl });

        const res = await request(app).get('/api/dreams').set('Authorization', `Bearer ${token}`);
        expect(res.body[0].imageUrl).toBe(imageUrl);
        expect(res.body[0].imageUrl).not.toMatch(/^data:/);
        expect(JSON.stringify(res.body).length).toBeLessThan(2000);

        await deleteImage(imageUrl);
    });
});

describe('DELETE /api/dreams/:id', () => {
    it('removes the caller’s own dream', async () => {
        const token = await register('del@test.local');
        const created = await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${token}`)
            .send({ text: 'temporary' });

        const res = await request(app)
            .delete(`/api/dreams/${created.body.id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, id: created.body.id });

        const after = await request(app).get('/api/dreams').set('Authorization', `Bearer ${token}`);
        expect(after.body).toEqual([]);
    });

    it('deletes the stored image alongside the dream', async () => {
        const token = await register('delimg@test.local');
        const imageUrl = await saveImage(PNG, 'image/png');
        const file = join(UPLOADS_DIR, basename(imageUrl));
        expect(existsSync(file)).toBe(true);

        const created = await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${token}`)
            .send({ text: 'with image', imageUrl });

        await request(app).delete(`/api/dreams/${created.body.id}`).set('Authorization', `Bearer ${token}`);
        expect(existsSync(file), 'image file leaked after its dream was deleted').toBe(false);
    });

    it('handles a legacy base64 dream without erroring', async () => {
        const token = await register('legacy@test.local');
        const created = await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${token}`)
            .send({ text: 'legacy', imageUrl: 'data:image/png;base64,AAAA' });

        const res = await request(app)
            .delete(`/api/dreams/${created.body.id}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
    });

    it('will not delete another user’s dream', async () => {
        const created = await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${bob}`)
            .send({ text: "bob's private dream" });

        const res = await request(app)
            .delete(`/api/dreams/${created.body.id}`)
            .set('Authorization', `Bearer ${alice}`);

        expect(res.status).toBe(404);

        const stillThere = await request(app).get('/api/dreams').set('Authorization', `Bearer ${bob}`);
        expect(stillThere.body.some((d: { id: string }) => d.id === created.body.id)).toBe(true);
    });

    it('returns 404 for an unknown id', async () => {
        const res = await request(app)
            .delete('/api/dreams/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${alice}`);
        expect(res.status).toBe(404);
    });
});
