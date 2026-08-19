/** One screen name understood by App's navigate(). */
export type ScreenName = 'home' | 'add' | 'archive' | 'models' | 'detail' | 'profile';

/** Every screen receives this; params carries the screen-specific argument. */
export type NavigateFn = (screen: ScreenName | string, params?: any) => void;

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

export interface Dream {
    id: string;
    date: string;
    title: string;
    content: string;
    lucid: boolean;
    themes: string[];
    mood: string;
    chatHistory: { role: 'user' | 'assistant'; content: string }[];
    text?: string;
    imageUrl?: string;
    model?: string;
    language?: string;
    layout?: string;
    interpretation?: string | DreamInterpretation;
    transcription?: string;
}

export interface User {
    email: string;
    name: string;
    createdAt: string;
}

/** Narrows an unknown catch binding to something displayable. */
export function errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Something went wrong.';
}
