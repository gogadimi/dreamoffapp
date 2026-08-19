import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './db.js';

export interface DreamSymbol {
  element: string;
  archetype?: string;
  meaning: string;
}

export interface DreamInterpretation {
  summary?: string;
  overview?: string;
  archetypes?: string;
  scientific?: string;
  symbols?: DreamSymbol[];
  reflections?: string[];
  actions?: string[];
  themes?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DreamAttributes {
  id: string;
  date: Date;
  title: string | null;
  content: string | null;
  lucid: boolean;
  mood: string | null;
  themes: string[];
  chatHistory: ChatMessage[];
  // ── The dream as the app actually produces it ──
  text: string | null;
  model: string | null;
  language: string | null;
  layout: string | null;
  transcription: string | null;
  interpretation: DreamInterpretation | string | null;
  imageUrl: string | null;
  userId?: string;
}

type DreamOptionalAttributes =
  | 'id' | 'date' | 'lucid' | 'themes' | 'chatHistory'
  | 'title' | 'content' | 'mood'
  | 'text' | 'model' | 'language' | 'layout'
  | 'transcription' | 'interpretation' | 'imageUrl';

interface DreamCreationAttributes extends Optional<DreamAttributes, DreamOptionalAttributes> {}

// See the note in User.ts — `declare` is required, `public x!: T` is not.
class Dream extends Model<DreamAttributes, DreamCreationAttributes> implements DreamAttributes {
  declare id: string;
  declare date: Date;
  declare title: string | null;
  declare content: string | null;
  declare lucid: boolean;
  declare mood: string | null;
  declare themes: string[];
  declare chatHistory: ChatMessage[];
  declare text: string | null;
  declare model: string | null;
  declare language: string | null;
  declare layout: string | null;
  declare transcription: string | null;
  declare interpretation: DreamInterpretation | string | null;
  declare imageUrl: string | null;
  declare userId: string;
}

Dream.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    title: { type: DataTypes.STRING, allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: true },
    lucid: { type: DataTypes.BOOLEAN, defaultValue: false },
    mood: { type: DataTypes.STRING, allowNull: true },
    themes: { type: DataTypes.JSON, defaultValue: [] },
    chatHistory: { type: DataTypes.JSON, defaultValue: [] },
    text: { type: DataTypes.TEXT, allowNull: true },
    model: { type: DataTypes.STRING, allowNull: true },
    language: { type: DataTypes.STRING, allowNull: true },
    layout: { type: DataTypes.STRING, allowNull: true },
    transcription: { type: DataTypes.TEXT, allowNull: true },
    interpretation: { type: DataTypes.JSON, allowNull: true },
    // A path such as "/uploads/<uuid>.png" -- see storage.ts. Kept as TEXT
    // rather than STRING so rows written before that change, which still hold
    // full base64 data URIs, keep working; both render fine in an <img>.
    imageUrl: { type: DataTypes.TEXT, allowNull: true }
}, { sequelize, modelName: 'Dream', timestamps: true });

export default Dream;
