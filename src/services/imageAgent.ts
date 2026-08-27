import { apiFetch } from './authApi';

/**
 * Calls the backend to generate a dream visualization image.
 */
export const generateDreamImage = async (text: string): Promise<string> => {
    try {
        const response = await apiFetch('/api/ai/image', {
            method: 'POST',
            body: JSON.stringify({ text })
        });
        return response.imageUrl;
    } catch (error) {
        console.error('Frontend AI Image Error:', error);
        throw error;
    }
};
