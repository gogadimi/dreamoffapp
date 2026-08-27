import sequelize from './db.js';
import User from './User.js';
import Dream from './Dream.js';

// Define associations
User.hasMany(Dream, { foreignKey: 'userId', as: 'dreams' });
Dream.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Schema changes go through server/migrations, not sync(). See models/migrator.ts.
export { migrateDB } from './migrator.js';

export { sequelize, User, Dream };
