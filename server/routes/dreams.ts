import { Router, Request, Response } from 'express';
import Dream from '../models/Dream.js';
import { authenticateToken } from '../middleware/auth.js';
import { deleteImage } from '../storage.js';
import { languageName } from '../languages.js';
import { generateText, isGeminiConfigured } from '../services/gemini.js';
import type { ChatMessage } from '../models/Dream.js';

const router = Router();

// All dream routes require authentication
router.use(authenticateToken);

// Single source of truth for the wire format the frontend consumes.
function serialize(d: Dream) {
    return {
        id: d.id,
        date: d.date,
        title: d.title ?? '',
        content: d.content ?? '',
        lucid: d.lucid ?? false,
        themes: d.themes ?? [],
        mood: d.mood ?? '',
        chatHistory: d.chatHistory ?? [],
        text: d.text ?? '',
        model: d.model ?? '',
        language: d.language ?? '',
        layout: d.layout ?? '',
        transcription: d.transcription ?? '',
        interpretation: d.interpretation ?? null,
        imageUrl: d.imageUrl ?? null
    };
}

// Explicit allow-list — never spread req.body straight into create().
const WRITABLE = [
    'date', 'title', 'content', 'lucid', 'mood', 'themes', 'chatHistory',
    'text', 'model', 'language', 'layout', 'transcription', 'interpretation', 'imageUrl'
] as const;

type WritableField = (typeof WRITABLE)[number];
type DreamInput = Partial<Record<WritableField, unknown>>;

function pickWritable(body: Record<string, unknown>): DreamInput {
    const out: DreamInput = {};
    for (const key of WRITABLE) {
        if (body[key] !== undefined) out[key] = body[key];
    }
    return out;
}

// ── Get all dreams for the current user ──
router.get('/', async (req: Request, res: Response) => {
    try {
        const dreams = await Dream.findAll({
            where: { userId: req.user!.id },
            order: [['date', 'DESC']]
        });

        res.json(dreams.map(serialize));
    } catch (err) {
        console.error('Fetch dreams error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Add a new dream ──
router.post('/', async (req: Request, res: Response) => {
    try {
        // The allow-list is validated at runtime, not by the type system;
        // Sequelize's creation type cannot express "some subset of these".
        const newDream = await Dream.create({
            ...pickWritable(req.body ?? {}),
            userId: req.user!.id
        } as Parameters<typeof Dream.create>[0]);

        res.status(201).json(serialize(newDream));
    } catch (err) {
        console.error('Add dream error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Delete a dream ──
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        // Read the row first so we know which file to clean up.
        const dream = await Dream.findOne({
            where: { id: req.params.id, userId: req.user!.id }
        });

        if (!dream) {
            return res.status(404).json({ error: 'Dream not found' });
        }

        const imagePath = dream.imageUrl;
        await dream.destroy();

        // Orphaned files are not worth failing the request over.
        await deleteImage(imagePath);

        res.json({ success: true, id: req.params.id });
    } catch (err) {
        console.error('Delete dream error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Keeps one dream's conversation from growing without bound, and keeps the
// prompt inside a sane token budget. Older turns drop out of the context but
// stay in the stored transcript.
const CHAT_CONTEXT_TURNS = 12;
const MAX_MESSAGE_LENGTH = 2000;

function chatPrompt(dream: Dream, history: ChatMessage[], question: string): string {
    const interpretation =
        typeof dream.interpretation === 'string'
            ? dream.interpretation
            : JSON.stringify(dream.interpretation ?? {});

    const transcript = history
        .slice(-CHAT_CONTEXT_TURNS)
        .map(m => `${m.role === 'user' ? 'User' : 'Analyst'}: ${m.content}`)
        .join('\n');

    return `You are a professional dream analyst continuing a conversation with someone about their own dream.

The dream, as they described it:
"${dream.text ?? dream.content ?? ''}"

The interpretation already given to them, using the "${dream.model ?? 'jungian'}" framework:
${interpretation}

${transcript ? `Conversation so far:
${transcript}
` : ''}
The user now asks: "${question}"

Answer in 2-4 sentences. Be specific to THIS dream and THIS interpretation rather than
giving generic advice. Your entire reply MUST be in ${languageName(dream.language)}.
Reply with plain prose only: no JSON, no markdown, no headings, no bullet points.`;
}

// ── Continue the conversation about a dream ──
router.post('/:id/chat', async (req: Request, res: Response) => {
    try {
        const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

        if (!message) {
            return res.status(400).json({ error: 'A message is required.' });
        }
        if (message.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({ error: `Message must be under ${MAX_MESSAGE_LENGTH} characters.` });
        }
        // Resolve the resource before reporting on server capability: a dream
        // that does not exist should 404 whether or not Gemini is configured.
        // Loading it is also the ownership check -- another user's id simply
        // does not resolve.
        const dream = await Dream.findOne({
            where: { id: req.params.id, userId: req.user!.id }
        });

        if (!dream) {
            return res.status(404).json({ error: 'Dream not found' });
        }

        if (!isGeminiConfigured()) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
        }

        const history: ChatMessage[] = Array.isArray(dream.chatHistory) ? dream.chatHistory : [];
        const reply = await generateText(chatPrompt(dream, history, message));

        // Persist both turns, so the conversation survives a reload. Assigning
        // a new array matters: Sequelize does not detect in-place JSON mutation.
        const updated: ChatMessage[] = [
            ...history,
            { role: 'user', content: message },
            { role: 'assistant', content: reply }
        ];
        dream.chatHistory = updated;
        await dream.save();

        res.json({ reply, chatHistory: updated });
    } catch (error) {
        console.error('Dream chat error:', error);
        res.status(500).json({ error: 'Failed to reach the AI. Please try again.' });
    }
});

export default router;
