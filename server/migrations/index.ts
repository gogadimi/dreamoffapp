// Schema migrations.
//
// Listed explicitly rather than discovered by glob: a static array is typed,
// has a guaranteed order, and imports cleanly under Node, tsx and Vite alike.
// Add new migrations to the end of the array and never edit one that has
// already shipped -- write a follow-up instead.
//
// Every migration here is written to be idempotent. This project adopted
// migrations after running sequelize.sync() in production, so a live database
// may already have some of this schema without any of it being recorded. A
// migration that assumes a clean slate would either fail or, worse, be marked
// applied while silently doing nothing.

import { DataTypes, QueryInterface } from 'sequelize';

export interface Migration {
    name: string;
    up: (queryInterface: QueryInterface) => Promise<void>;
    down: (queryInterface: QueryInterface) => Promise<void>;
}

const timestamps = {
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
};

/** Columns the app writes on every dream but sync() never created. */
const DREAM_CONTENT_COLUMNS = {
    text: { type: DataTypes.TEXT, allowNull: true },
    model: { type: DataTypes.STRING, allowNull: true },
    language: { type: DataTypes.STRING, allowNull: true },
    layout: { type: DataTypes.STRING, allowNull: true },
    transcription: { type: DataTypes.TEXT, allowNull: true },
    interpretation: { type: DataTypes.JSON, allowNull: true },
    imageUrl: { type: DataTypes.TEXT, allowNull: true }
} as const;

async function existingColumns(queryInterface: QueryInterface, table: string): Promise<string[]> {
    try {
        return Object.keys(await queryInterface.describeTable(table));
    } catch {
        return [];
    }
}

async function existingIndexes(queryInterface: QueryInterface, table: string): Promise<string[]> {
    try {
        const indexes = (await queryInterface.showIndex(table)) as { name: string }[];
        return indexes.map(index => index.name);
    } catch {
        return [];
    }
}

/**
 * Baseline. Mirrors the schema sequelize.sync() produced, so an existing
 * database adopts the migration system without being rebuilt: SQLite's
 * createTable emits CREATE TABLE IF NOT EXISTS.
 *
 * Note that this makes the migration a no-op on a database that already has
 * the tables, even if their columns are out of date. Migration 003 reconciles
 * that; do not rely on this one alone.
 */
const initialSchema: Migration = {
    name: '001-initial-schema',

    async up(queryInterface) {
        await queryInterface.createTable('Users', {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            name: { type: DataTypes.STRING, allowNull: false },
            email: { type: DataTypes.STRING, allowNull: false, unique: true },
            password: { type: DataTypes.STRING, allowNull: false },
            ...timestamps
        });

        await queryInterface.createTable('Dreams', {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
            title: { type: DataTypes.STRING, allowNull: true },
            content: { type: DataTypes.TEXT, allowNull: true },
            lucid: { type: DataTypes.BOOLEAN, defaultValue: false },
            mood: { type: DataTypes.STRING, allowNull: true },
            themes: { type: DataTypes.JSON, defaultValue: [] },
            chatHistory: { type: DataTypes.JSON, defaultValue: [] },
            ...DREAM_CONTENT_COLUMNS,
            ...timestamps,
            userId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: 'Users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('Dreams');
        await queryInterface.dropTable('Users');
    }
};

/**
 * Every dream query filters by userId, and sync() never created an index for
 * it, so each one was a full table scan.
 */
const dreamsUserIdIndex: Migration = {
    name: '002-index-dreams-user-id',

    async up(queryInterface) {
        if ((await existingIndexes(queryInterface, 'Dreams')).includes('dreams_user_id')) return;
        await queryInterface.addIndex('Dreams', ['userId'], { name: 'dreams_user_id' });
    },

    async down(queryInterface) {
        if (!(await existingIndexes(queryInterface, 'Dreams')).includes('dreams_user_id')) return;
        await queryInterface.removeIndex('Dreams', 'dreams_user_id');
    }
};

/**
 * Reconciles a database whose Dreams table predates the content columns.
 *
 * Such a database already had a Dreams table, so migration 001 skipped it
 * entirely and was recorded as applied while adding nothing. Without this, a
 * deploy that carried an older database.sqlite forward would keep dropping
 * text, model, transcription, interpretation and imageUrl on every write --
 * exactly the data loss the columns were added to fix.
 *
 * No-op on a database created by 001, where the columns already exist.
 */
const backfillDreamContentColumns: Migration = {
    name: '003-backfill-dream-content-columns',

    async up(queryInterface) {
        const present = await existingColumns(queryInterface, 'Dreams');

        for (const [column, definition] of Object.entries(DREAM_CONTENT_COLUMNS)) {
            if (present.includes(column)) continue;
            await queryInterface.addColumn('Dreams', column, definition);
        }
    },

    async down(queryInterface) {
        const present = await existingColumns(queryInterface, 'Dreams');

        for (const column of Object.keys(DREAM_CONTENT_COLUMNS)) {
            if (!present.includes(column)) continue;
            await queryInterface.removeColumn('Dreams', column);
        }
    }
};

export const migrations: Migration[] = [
    initialSchema,
    dreamsUserIdIndex,
    backfillDreamContentColumns
];
