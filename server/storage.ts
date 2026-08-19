// On-disk storage for generated dream images.
//
// These used to be inlined into the Dream row as base64 data URIs. An SDXL
// render is 1-2 MB, which meant every row carried a megabyte of text and
// GET /api/dreams re-sent all of it on every load -- a 20-dream archive was a
// ~30 MB JSON response. Images now live on disk; the row keeps only a path.

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const UPLOADS_DIR = join(__dirname, 'uploads');
export const UPLOADS_ROUTE = '/uploads';

const EXTENSION_BY_MIME: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp'
};

export async function ensureUploadsDir(): Promise<void> {
    await mkdir(UPLOADS_DIR, { recursive: true });
}

/**
 * Writes an image and returns the public path to store on the dream.
 *
 * Filenames are random UUIDs, so they are not enumerable, but anyone holding
 * a path can fetch the image without authenticating -- the same trade-off most
 * CDN-backed uploads make. If dream images need to be genuinely private, swap
 * this for an authenticated route with signed, expiring URLs.
 */
export async function saveImage(buffer: Buffer, mimeType?: string): Promise<string> {
    await ensureUploadsDir();
    const ext = EXTENSION_BY_MIME[(mimeType || '').toLowerCase()] || 'png';
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(join(UPLOADS_DIR, filename), buffer);
    return `${UPLOADS_ROUTE}/${filename}`;
}

/**
 * Best-effort removal of a stored image. Silently ignores anything that is not
 * one of our own upload paths (older rows still hold base64 data URIs) and any
 * file that is already gone.
 */
export async function deleteImage(publicPath: string | null | undefined): Promise<void> {
    if (!publicPath || !publicPath.startsWith(`${UPLOADS_ROUTE}/`)) return;

    // basename() strips any traversal attempt before it reaches the filesystem.
    const filename = basename(publicPath);
    if (!filename || filename === '.' || filename === '..') return;

    try {
        await unlink(join(UPLOADS_DIR, filename));
    } catch (err) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code !== 'ENOENT') {
            console.warn(`[DreamOff] Could not delete image ${filename}:`, err);
        }
    }
}
