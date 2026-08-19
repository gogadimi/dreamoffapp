// DreamOff API Server — entrypoint.
// Boots the database and image storage, then binds the port.
// The Express app itself lives in app.ts so it can be tested in isolation.

// Import config first — it validates the environment and exits on failure.
import { PORT, IS_PRODUCTION } from './config.js';
import app from './app.js';
import { initDB } from './models/db.js';
import { syncDB } from './models/index.js';
import { ensureUploadsDir } from './storage.js';

async function start() {
    await initDB();
    await syncDB();
    await ensureUploadsDir();
    app.listen(PORT, () => {
        console.log(`[DreamOff] Server running on port ${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
    });
}

start().catch(console.error);
