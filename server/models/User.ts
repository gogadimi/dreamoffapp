import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './db.js';

interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}
interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

// NOTE: every attribute below uses `declare` (not `public x!: T`).
// Real class fields are emitted under target ES2022 and would shadow
// Sequelize's attribute getters/setters, making every read undefined.
// https://sequelize.org/docs/v6/core-concepts/model-basics/#caveat-with-public-class-fields
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare name: string;
  declare email: string;
  declare password: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }
}, { sequelize, modelName: 'User', timestamps: true });

export default User;
