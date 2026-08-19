import { Router, Response } from 'express';
import Dream from '../models/Dream.js';
import { User } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';

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

function pickWritable(body: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const key of WRITABLE) {
        if (body[key] !== undefined) out[key] = body[key];
    }
    return out;
}

// ── Get all dreams for the current user ──
router.get('/', async (req: any, res: Response): Promise<any> => {
    try {
        const user = await User.findOne({ where: { email: req.user.email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const dreams = await Dream.findAll({
            where: { userId: user.id },
            order: [['date', 'DESC']]
        });

        res.json(dreams.map(serialize));
    } catch (err) {
        console.error('Fetch dreams error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Add a new dream ──
router.post('/', async (req: any, res: Response): Promise<any> => {
    try {
        const user = await User.findOne({ where: { email: req.user.email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const newDream = await Dream.create({
            ...pickWritable(req.body ?? {}),
            userId: user.id
        } as any);

        res.status(201).json(serialize(newDream));
    } catch (err) {
        console.error('Add dream error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Delete a dream ──
router.delete('/:id', async (req: any, res: Response): Promise<any> => {
    try {
        const user = await User.findOne({ where: { email: req.user.email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const deletedCount = await Dream.destroy({
            where: { id: req.params.id, userId: user.id }
        });

        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Dream not found' });
        }

        res.json({ success: true, id: req.params.id });
    } catch (err) {
        console.error('Delete dream error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
