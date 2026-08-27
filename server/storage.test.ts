import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { saveImage, deleteImage, UPLOADS_DIR, UPLOADS_ROUTE, ensureUploadsDir } from './storage.js';

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);

const written: string[] = [];

async function store(mime?: string) {
    const path = await saveImage(PNG, mime);
    written.push(path);
    return path;
}

const onDisk = (publicPath: string) => join(UPLOADS_DIR, basename(publicPath));

afterEach(async () => {
    for (const path of written.splice(0)) await deleteImage(path);
});

describe('saveImage', () => {
    it('writes the bytes it was given', async () => {
        const path = await store('image/png');
        expect(existsSync(onDisk(path))).toBe(true);
        expect(readFileSync(onDisk(path)).equals(PNG)).toBe(true);
    });

    it('returns a public path under the uploads route', async () => {
        const path = await store('image/png');
        expect(path.startsWith(`${UPLOADS_ROUTE}/`)).toBe(true);
    });

    it('picks the extension from the mime type', async () => {
        expect(await store('image/png')).toMatch(/\.png$/);
        expect(await store('image/jpeg')).toMatch(/\.jpg$/);
        expect(await store('image/webp')).toMatch(/\.webp$/);
    });

    it('falls back to png for an unknown or absent mime type', async () => {
        expect(await store(undefined)).toMatch(/\.png$/);
        expect(await store('application/octet-stream')).toMatch(/\.png$/);
    });

    it('never reuses a filename', async () => {
        const paths = await Promise.all([store(), store(), store(), store(), store()]);
        expect(new Set(paths).size).toBe(paths.length);
    });

    it('creates the uploads directory if it is missing', async () => {
        await ensureUploadsDir();
        expect(existsSync(UPLOADS_DIR)).toBe(true);
    });
});

describe('deleteImage', () => {
    it('removes a stored image', async () => {
        const path = await saveImage(PNG, 'image/png');
        expect(existsSync(onDisk(path))).toBe(true);

        await deleteImage(path);
        expect(existsSync(onDisk(path))).toBe(false);
    });

    it('ignores a path that is already gone', async () => {
        await expect(deleteImage(`${UPLOADS_ROUTE}/missing.png`)).resolves.toBeUndefined();
    });

    it('ignores null and empty input', async () => {
        await expect(deleteImage(null)).resolves.toBeUndefined();
        await expect(deleteImage(undefined)).resolves.toBeUndefined();
        await expect(deleteImage('')).resolves.toBeUndefined();
    });

    it('ignores legacy base64 data URIs from before on-disk storage', async () => {
        await expect(deleteImage('data:image/png;base64,AAAA')).resolves.toBeUndefined();
    });

    it('refuses to follow a path traversal out of the uploads directory', async () => {
        await ensureUploadsDir();
        const bystander = join(UPLOADS_DIR, '..', 'do-not-delete.txt');
        writeFileSync(bystander, 'important');

        await deleteImage(`${UPLOADS_ROUTE}/../do-not-delete.txt`);
        expect(existsSync(bystander), 'traversal deleted a file outside uploads').toBe(true);
    });

    it('ignores paths outside the uploads route entirely', async () => {
        await ensureUploadsDir();
        const outside = join(UPLOADS_DIR, '..', 'other.txt');
        writeFileSync(outside, 'keep');

        await deleteImage('/etc/passwd');
        await deleteImage('other.txt');
        expect(existsSync(outside)).toBe(true);
    });
});
