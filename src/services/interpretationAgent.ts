import { apiFetch } from './authApi';
import { DreamInterpretation } from '../types/index';

/** Shape returned by POST /api/ai/interpret. */
export interface InterpretationResponse {
    transcription: string;
    interpretation: DreamInterpretation;
    layout: string;
    modelUsed: string;
    language: string;
}

/**
 * Calls the backend to analyze and interpret the dream using the selected model.
 */
export const interpretDream = async (
    text: string, 
    model: string, 
    deviceType: string = 'mobile', 
    forcedLanguage: string | null = null
): Promise<InterpretationResponse> => {
    try {
        // Assume default detecting language happens on the frontend or backend,
        // we'll pass the explicitly forced language or let the backend prompt decide based on language property.
        const language = forcedLanguage || (text.match(/[\u0400-\u04FF]/) ? 'mk' : 'en');

        const response = await apiFetch('/api/ai/interpret', {
            method: 'POST',
            body: JSON.stringify({
                text,
                model,
                language,
                layout: deviceType
            })
        });

        // The response shape from our backend perfectly matches the frontend's expected properties
        return {
            transcription: response.transcription,
            interpretation: response.interpretation,
            layout: response.layout,
            modelUsed: response.modelUsed,
            language: response.language
        };
    } catch (error) {
        console.error('Frontend AI Interpretation Error:', error);
        throw error;
    }
};
