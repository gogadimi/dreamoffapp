// DreamOff API — Express application.
//
// Kept separate from server.ts so tests can mount the app with supertest
// without binding a port or starting the database.

import { IS_PRODUCTION } from './config.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPLOADS_DIR, UPLOADS_ROUTE } from './storage.js';
import authRoutes from './routes/auth.js';
import dreamsRoutes from './routes/dreams.js';
import aiRoutes from './routes/ai.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// cPanel/Netlify front the app with a reverse proxy. Without this, every
// request looks like it comes from the proxy and the rate limiter would
// throttle all users as one. Trust exactly one hop, not an arbitrary chain.
app.set('trust proxy', 1);

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
// non-API GET. maxAge is safe: filenames are unique UUIDs.
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

export default app;
