import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

// Gemini is mocked: there is no API key in test, and the value of these tests
// is the routing, ownership, persistence and prompt construction around it.
const generateText = vi.fn();
const isGeminiConfigured = vi.fn(() => true);

vi.mock('../services/gemini.js', () => ({
    generateText,
    generateJSON: vi.fn(),
    isGeminiConfigured
}));

const { default: app } = await import('../app.js');
const { initDB } = await import('../models/db.js');
const { migrateDB } = await import('../models/index.js');

let token = '';
let dreamId = '';

async function createDream(overrides: Record<string, unknown> = {}) {
    const res = await request(app)
        .post('/api/dreams')
        .set('Authorization', `Bearer ${token}`)
        .send({
            text: 'I was flying over a red ocean',
            model: 'jung',
            language: 'mk',
            interpretation: { summary: 'A dream of freedom' },
            ...overrides
        });
    return res.body.id as string;
}

const ask = (id: string, message: string, auth = token) =>
    request(app).post(`/api/dreams/${id}/chat`).set('Authorization', `Bearer ${auth}`).send({ message });

beforeAll(async () => {
    await initDB();
    await migrateDB();

    const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Chatter', email: 'chat@test.local', password: 'secret123' });
    token = res.body.token;
    dreamId = await createDream();
});

beforeEach(() => {
    generateText.mockReset();
    generateText.mockResolvedValue('The ocean stands for what you have not yet put into words.');
    isGeminiConfigured.mockReturnValue(true);
});

describe('POST /api/dreams/:id/chat', () => {
    it('requires a token', async () => {
        const res = await request(app).post(`/api/dreams/${dreamId}/chat`).send({ message: 'hi' });
        expect(res.status).toBe(401);
    });

    it('answers a question about the dream', async () => {
        const res = await ask(dreamId, 'What does the ocean mean?');

        expect(res.status).toBe(200);
        expect(res.body.reply).toBe('The ocean stands for what you have not yet put into words.');
        expect(generateText).toHaveBeenCalledOnce();
    });

    it('rejects an empty or whitespace-only message', async () => {
        for (const message of ['', '   ']) {
            const res = await ask(dreamId, message);
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/message is required/i);
        }
        expect(generateText).not.toHaveBeenCalled();
    });

    it('rejects an over-long message before spending a request', async () => {
        const res = await ask(dreamId, 'x'.repeat(2001));
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/under 2000 characters/i);
        expect(generateText).not.toHaveBeenCalled();
    });

    it('reports a missing API key rather than failing obscurely', async () => {
        isGeminiConfigured.mockReturnValue(false);
        const res = await ask(dreamId, 'anything');

        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/GEMINI_API_KEY/);
    });

    it('returns 500 with a usable message when the AI call fails', async () => {
        generateText.mockRejectedValue(new Error('upstream exploded'));
        const res = await ask(dreamId, 'What does the ocean mean?');

        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/failed to reach the ai/i);
        // The upstream message is logged, not leaked to the client.
        expect(res.body.error).not.toMatch(/exploded/);
    });
});

describe('chat prompt construction', () => {
    it('includes the dream, the interpretation and the question', async () => {
        await ask(dreamId, 'Why a red ocean?');
        const prompt = generateText.mock.calls[0][0] as string;

        expect(prompt).toContain('I was flying over a red ocean');
        expect(prompt).toContain('A dream of freedom');
        expect(prompt).toContain('Why a red ocean?');
        expect(prompt).toContain('jung');
    });

    // Regression: the picker offers 21 languages but the prompt only ever
    // named Macedonian or English.
    it('names the dream language so the reply is not always English', async () => {
        await ask(dreamId, 'question');
        expect(generateText.mock.calls[0][0]).toContain('Macedonian');

        const greek = await createDream({ language: 'el' });
        await ask(greek, 'question');
        expect(generateText.mock.calls[1][0]).toContain('Greek');
    });

    it('carries earlier turns into the prompt', async () => {
        const id = await createDream();
        await ask(id, 'first question');
        await ask(id, 'second question');

        const second = generateText.mock.calls[1][0] as string;
        expect(second).toContain('first question');
        expect(second).toContain('Conversation so far');
    });

    it('caps how much history it sends', async () => {
        const id = await createDream();
        for (let i = 1; i <= 9; i++) await ask(id, `question ${i}`);

        const last = generateText.mock.calls[8][0] as string;
        // 12 messages of context is 6 exchanges, so the earliest drops out.
        expect(last).toContain('question 8');
        expect(last).not.toContain('question 1:');
    });
});

describe('chat persistence', () => {
    it('stores both turns on the dream', async () => {
        const id = await createDream();
        const res = await ask(id, 'What does the ocean mean?');

        expect(res.body.chatHistory).toEqual([
            { role: 'user', content: 'What does the ocean mean?' },
            { role: 'assistant', content: 'The ocean stands for what you have not yet put into words.' }
        ]);
    });

    it('survives a reload, which is the whole point of persisting it', async () => {
        const id = await createDream();
        await ask(id, 'remembered?');

        const listed = await request(app).get('/api/dreams').set('Authorization', `Bearer ${token}`);
        const reloaded = listed.body.find((d: { id: string }) => d.id === id);

        expect(reloaded.chatHistory).toHaveLength(2);
        expect(reloaded.chatHistory[0].content).toBe('remembered?');
    });

    it('appends rather than replacing', async () => {
        const id = await createDream();
        await ask(id, 'one');
        const res = await ask(id, 'two');

        expect(res.body.chatHistory.map((m: { content: string }) => m.content)).toEqual([
            'one',
            'The ocean stands for what you have not yet put into words.',
            'two',
            'The ocean stands for what you have not yet put into words.'
        ]);
    });

    it('does not write anything when the AI call fails', async () => {
        const id = await createDream();
        generateText.mockRejectedValue(new Error('nope'));
        await ask(id, 'lost question');

        const listed = await request(app).get('/api/dreams').set('Authorization', `Bearer ${token}`);
        const reloaded = listed.body.find((d: { id: string }) => d.id === id);
        expect(reloaded.chatHistory).toEqual([]);
    });
});

describe('chat ownership', () => {
    it('returns 404 for a dream belonging to someone else', async () => {
        const other = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Other', email: 'other@test.local', password: 'secret123' });

        const res = await ask(dreamId, 'let me in', other.body.token);

        expect(res.status).toBe(404);
        expect(generateText).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown dream', async () => {
        const res = await ask('00000000-0000-0000-0000-000000000000', 'hello');
        expect(res.status).toBe(404);
    });

    // Found by hitting the live server: the API-key check used to run first, so
    // a dream that does not exist reported a server misconfiguration instead of
    // a missing resource.
    it('still 404s for an unknown dream when Gemini is not configured', async () => {
        isGeminiConfigured.mockReturnValue(false);
        const res = await ask('00000000-0000-0000-0000-000000000000', 'hello');
        expect(res.status).toBe(404);
    });

    it('still 404s for another user’s dream when Gemini is not configured', async () => {
        isGeminiConfigured.mockReturnValue(false);
        const other = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Third', email: 'third@test.local', password: 'secret123' });

        const res = await ask(dreamId, 'let me in', other.body.token);
        expect(res.status).toBe(404);
    });
});
