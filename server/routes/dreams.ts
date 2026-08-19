import { Router, Request, Response } from 'express';
import Dream from '../models/Dream.js';
import { authenticateToken } from '../middleware/auth.js';
import { deleteImage } from '../storage.js';

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

export default router;
