// DreamOff API Server — Production-ready
// Express + lowdb + JWT authentication
// Serves built React frontend in production

// Import config first — it validates the environment and exits on failure.
import { PORT, IS_PRODUCTION } from './config.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDB } from './models/db.js';
import { syncDB } from './models/index.js';
import { UPLOADS_DIR, UPLOADS_ROUTE, ensureUploadsDir } from './storage.js';
import authRoutes from './routes/auth.js';
import dreamsRoutes from './routes/dreams.js';
import aiRoutes from './routes/ai.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// ── CORS — same-origin only in production, open in dev ──
app.use(cors(IS_PRODUCTION ? { origin: false } : {}));

// Parse JSON bodies
app.use(express.json());

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/dreams', dreamsRoutes);
app.use('/api/ai', aiRoutes);

// ── Generated dream images ──
// Must be registered before the SPA fallback below, which swallows every
// non-API GET. maxAge is safe: filenames are content-unique UUIDs.
app.use(UPLOADS_ROUTE, express.static(UPLOADS_DIR, { maxAge: '30d', fallthrough: false }));

app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve built React frontend (production) ──
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback — all non-API routes serve index.html
app.get('*', (_req: Request, res: Response) => {
    res.sendFile(join(distPath, 'index.html'));
});

// ── Start ──
async function start() {
    await initDB();
    await syncDB();
    await ensureUploadsDir();
    app.listen(PORT, () => {
        console.log(`[DreamOff] Server running on port ${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
    });
}

start().catch(console.error);
