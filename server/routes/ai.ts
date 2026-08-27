import { Router, Request, Response } from 'express';
import { HfInference } from '@huggingface/inference';
import { authenticateToken } from '../middleware/auth.js';
import { HUGGINGFACE_API_KEY } from '../config.js';
import { saveImage } from '../storage.js';
import { languageName, languageCode } from '../languages.js';
import { generateText, generateJSON, isGeminiConfigured } from '../services/gemini.js';
import type { DreamInterpretation } from '../models/Dream.js';

const router = Router();

export function interpretationPrompt(text: string, model: string, language: string): string {
    // The picker offers 21 languages; naming the target explicitly is what
    // makes the other nineteen actually work.
    const langString = languageName(language);

    return `You are a professional dream analyst and psychologist.
        Analyze this dream provided by a user: "${text}".
        The user has selected the analytical model: "${model}".
        Your response MUST be entirely in ${langString}.
        IMPORTANT: Your entire response must be ONLY a raw, perfectly valid JSON object (no markdown, no backticks, no comments).

        Follow this strict JSON schema:
        {
          "summary": "1-2 sentence overview of the dream's core emotional theme.",
          "archetypes": "1 paragraph explaining archetypal meaning (e.g., Hero's journey, Shadow).",
          "scientific": "1 paragraph explaining scientifically what the brain might be doing (e.g., Threat simulation, memory consolidation).",
          "symbols": [{"element": "symbol name", "archetype": "related archetype", "meaning": "interpretation of this specific element"}],
          "reflections": ["A thought-provoking question for the user", "Another question"],
          "actions": ["An actionable piece of advice", "Another advice"],
          "themes": ["Theme 1", "Theme 2"]
        }`;
}

// POST /api/ai/interpret
router.post('/interpret', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { text, model, language, layout } = req.body ?? {};

        if (!isGeminiConfigured()) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
        }
        if (typeof text !== 'string' || !text.trim()) {
            return res.status(400).json({ error: 'A dream description is required.' });
        }

        const resolvedLanguage = languageCode(language);
        const interpretation = await generateJSON<DreamInterpretation>(
            interpretationPrompt(text, String(model ?? 'jung'), resolvedLanguage)
        );

        res.json({
            transcription: text,
            interpretation,
            layout: layout || 'mobile',
            modelUsed: model,
            language: resolvedLanguage
        });
    } catch (error) {
        console.error('AI Interpretation Error:', error);
        res.status(500).json({ error: 'Failed to interpret dream using AI. Please check the server logs.' });
    }
});

// POST /api/ai/image
router.post('/image', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { text } = req.body ?? {};

        if (!isGeminiConfigured() || !HUGGINGFACE_API_KEY) {
            return res.status(500).json({ error: 'API Keys are not configured on the server.' });
        }
        if (typeof text !== 'string' || !text.trim()) {
            return res.status(400).json({ error: 'A dream description is required.' });
        }

        // 1. Turn the dream into an image prompt.
        const imagePrompt = await generateText(
            `Create a short, descriptive 1-sentence prompt for an AI image generator (like Midjourney or DALL-E) based on this dream. Aim for a surreal, cinematic, mystical, and beautiful aesthetic. The dream is: "${text}". Reply ONLY with the English image prompt. Do NOT include any prefixes like "Prompt:".`
        );

        // 2. Request the image from Hugging Face.
        //    outputType is passed explicitly: without it TS resolves to the
        //    first overload (Promise<string>) while the call actually returns
        //    a Blob, which is what an `as Blob` cast used to paper over.
        const hf = new HfInference(HUGGINGFACE_API_KEY);
        const imageBlob = await hf.textToImage(
            {
                model: 'stabilityai/stable-diffusion-xl-base-1.0',
                inputs: imagePrompt,
                parameters: { negative_prompt: 'blurry, poor quality, text, words, watermark, ugly' }
            },
            { outputType: 'blob' }
        );

        // 3. Persist to disk and hand back a path, not a megabyte of base64.
        const buffer = Buffer.from(await imageBlob.arrayBuffer());
        const imageUrl = await saveImage(buffer, imageBlob.type);

        res.json({ imageUrl });
    } catch (error) {
        console.error('AI Image Error:', error);
        res.status(500).json({ error: 'Failed to generate image from AI.' });
    }
});

export default router;
