// Migration runner.
//
// Replaces sequelize.sync({ alter: true }), which inferred schema changes from
// the models on every boot. That is convenient in development and unsafe in
// production: an inferred ALTER can drop a column, and on SQLite it rebuilds
// the table to do it. Migrations are explicit, ordered and recorded.

import { Umzug, SequelizeStorage } from 'umzug';
import sequelize from './db.js';
import { migrations } from '../migrations/index.js';

const umzug = new Umzug({
    migrations: migrations.map(migration => ({
        name: migration.name,
        up: async () => migration.up(sequelize.getQueryInterface()),
        down: async () => migration.down(sequelize.getQueryInterface())
    })),
    storage: new SequelizeStorage({ sequelize }),
    logger: undefined
});

/** Applies every migration that has not run yet. */
export async function migrateDB(): Promise<void> {
    const applied = await umzug.up();

    if (applied.length === 0) {
        console.log('[DreamOff] Schema up to date');
        return;
    }

    for (const migration of applied) {
        console.log(`[DreamOff] Applied migration ${migration.name}`);
    }
}

/** Rolls back the most recent migration. Exposed for tests and recovery. */
export async function rollbackDB(): Promise<void> {
    await umzug.down();
}

/** Names of migrations that have not been applied yet. */
export async function pendingMigrations(): Promise<string[]> {
    const pending = await umzug.pending();
    return pending.map(migration => migration.name);
}

/** Names of migrations already recorded as applied. */
export async function executedMigrations(): Promise<string[]> {
    const executed = await umzug.executed();
    return executed.map(migration => migration.name);
}

export default umzug;
