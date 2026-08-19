import { describe, it, expect, beforeAll } from 'vitest';
import { DataTypes } from 'sequelize';
import sequelize from '../models/db.js';
import { initDB } from '../models/db.js';
import { migrateDB, pendingMigrations, executedMigrations, rollbackDB } from '../models/migrator.js';
import { migrations } from './index.js';

async function tableNames(): Promise<string[]> {
    const [rows] = (await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table'"
    )) as unknown as [{ name: string }[], unknown];
    return rows.map(r => r.name);
}

async function columnNames(table: string): Promise<string[]> {
    const [rows] = (await sequelize.query(`PRAGMA table_info('${table}')`)) as unknown as [
        { name: string }[],
        unknown
    ];
    return rows.map(r => r.name);
}

async function indexNames(table: string): Promise<string[]> {
    const [rows] = (await sequelize.query(`PRAGMA index_list('${table}')`)) as unknown as [
        { name: string }[],
        unknown
    ];
    return rows.map(r => r.name);
}

beforeAll(async () => {
    await initDB();
});

describe('migration definitions', () => {
    it('has a unique name per migration', () => {
        const names = migrations.map(m => m.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('keeps names in sorted order so execution order is obvious', () => {
        const names = migrations.map(m => m.name);
        expect(names).toEqual([...names].sort());
    });

    it('gives every migration an up and a down', () => {
        for (const migration of migrations) {
            expect(typeof migration.up, migration.name).toBe('function');
            expect(typeof migration.down, migration.name).toBe('function');
        }
    });
});

describe('migrateDB', () => {
    it('starts with everything pending', async () => {
        expect(await pendingMigrations()).toEqual(migrations.map(m => m.name));
        expect(await executedMigrations()).toEqual([]);
    });

    it('applies every migration', async () => {
        await migrateDB();

        expect(await executedMigrations()).toEqual(migrations.map(m => m.name));
        expect(await pendingMigrations()).toEqual([]);
    });

    it('creates both tables', async () => {
        const tables = await tableNames();
        expect(tables).toContain('Users');
        expect(tables).toContain('Dreams');
    });

    it('creates the full Dreams schema the app relies on', async () => {
        const columns = await columnNames('Dreams');
        for (const column of [
            'id', 'date', 'title', 'content', 'lucid', 'mood', 'themes', 'chatHistory',
            'text', 'model', 'language', 'layout', 'transcription', 'interpretation',
            'imageUrl', 'createdAt', 'updatedAt', 'userId'
        ]) {
            expect(columns, `Dreams.${column} missing`).toContain(column);
        }
    });

    it('indexes Dreams.userId, which every dream query filters on', async () => {
        expect(await indexNames('Dreams')).toContain('dreams_user_id');
    });

    it('records applied migrations so a second run is a no-op', async () => {
        const before = await executedMigrations();
        await migrateDB();
        expect(await executedMigrations()).toEqual(before);
    });

    it('is safe to run repeatedly', async () => {
        await expect(migrateDB()).resolves.toBeUndefined();
        await expect(migrateDB()).resolves.toBeUndefined();
        expect(await pendingMigrations()).toEqual([]);
    });
});

describe('rollback', () => {
    it('reverses the most recent migration and can reapply it', async () => {
        const last = migrations[migrations.length - 1].name;
        expect(last).toBe('003-backfill-dream-content-columns');

        await rollbackDB();
        expect(await pendingMigrations()).toContain(last);
        expect(await columnNames('Dreams')).not.toContain('interpretation');

        await migrateDB();
        expect(await pendingMigrations()).toEqual([]);
        expect(await columnNames('Dreams')).toContain('interpretation');
    });
});

describe('adopting a database that predates migrations', () => {
    // sync() shipped a Dreams table without the seven content columns. Because
    // createTable is IF NOT EXISTS, migration 001 skips such a table entirely
    // and is still recorded as applied. Migration 003 is what actually repairs
    // it; without that, a deploy carrying an older database.sqlite forward
    // would silently drop every interpretation again.
    it('adds the content columns to a pre-existing Dreams table', async () => {
        const qi = sequelize.getQueryInterface();

        // Rebuild the old shape: drop ours, recreate without the content columns.
        await qi.dropTable('Dreams');
        await qi.createTable('Dreams', {
            id: { type: DataTypes.UUID, primaryKey: true },
            date: { type: DataTypes.DATE },
            title: { type: DataTypes.STRING },
            content: { type: DataTypes.TEXT },
            lucid: { type: DataTypes.BOOLEAN },
            mood: { type: DataTypes.STRING },
            themes: { type: DataTypes.JSON },
            chatHistory: { type: DataTypes.JSON },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            userId: { type: DataTypes.UUID }
        });
        await sequelize.query("DELETE FROM SequelizeMeta");

        expect(await columnNames('Dreams')).toHaveLength(11);

        await migrateDB();

        const columns = await columnNames('Dreams');
        for (const column of ['text', 'model', 'language', 'layout', 'transcription', 'interpretation', 'imageUrl']) {
            expect(columns, `Dreams.${column} was not backfilled`).toContain(column);
        }
        expect(await indexNames('Dreams')).toContain('dreams_user_id');
    });

    it('leaves an already-current database untouched', async () => {
        const before = await columnNames('Dreams');
        await migrateDB();
        expect(await columnNames('Dreams')).toEqual(before);
    });
});
