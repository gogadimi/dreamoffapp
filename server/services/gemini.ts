// Gemini access, in one place.
//
// Each route used to construct its own GoogleGenerativeAI client and repeat
// the "strip the markdown fence, then JSON.parse" dance. Centralising it means
// the model name is configured once and tests can mock a single module.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '../config.js';

const MODEL = 'gemini-2.5-flash';

export function isGeminiConfigured(): boolean {
    return Boolean(GEMINI_API_KEY);
}

function model() {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    return new GoogleGenerativeAI(GEMINI_API_KEY).getGenerativeModel({ model: MODEL });
}

/** Runs a prompt and returns the trimmed text response. */
export async function generateText(prompt: string): Promise<string> {
    const result = await model().generateContent(prompt);
    return result.response.text().trim();
}

/**
 * Runs a prompt that is expected to return JSON.
 *
 * Models wrap JSON in a markdown fence often enough that stripping it is not
 * optional, and a fence can carry a language tag or trailing newline.
 */
export async function generateJSON<T>(prompt: string): Promise<T> {
    const raw = await generateText(prompt);

    const unfenced = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

    try {
        return JSON.parse(unfenced) as T;
    } catch {
        throw new Error('The AI returned a response that was not valid JSON.');
    }
}
