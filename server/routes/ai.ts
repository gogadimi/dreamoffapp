import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import { authenticateToken } from '../middleware/auth.js';
import { GEMINI_API_KEY, HUGGINGFACE_API_KEY } from '../config.js';

const router = Router();

// POST /api/ai/interpret
router.post('/interpret', authenticateToken, async (req: any, res: any) => {
    try {
        const { text, model, language, layout } = req.body;
        
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const generativeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const langString = language === 'mk' ? 'Macedonian' : 'English';
        const prompt = `You are a professional dream analyst and psychologist.
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

        const result = await generativeModel.generateContent(prompt);
        let responseText = result.response.text().trim();
        
        // Clean up markdown block if the model outputs it
        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (responseText.startsWith('```')) {
            responseText = responseText.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const interpretation = JSON.parse(responseText);
        
        res.json({
            transcription: text,
            interpretation,
            layout: layout || 'mobile',
            modelUsed: model,
            language
        });
    } catch (error) {
        console.error('AI Interpretation Error:', error);
        res.status(500).json({ error: 'Failed to interpret dream using AI. Please check the server logs.' });
    }
});

// POST /api/ai/image
router.post('/image', authenticateToken, async (req: any, res: any) => {
    try {
        const { text } = req.body;
        
        if (!GEMINI_API_KEY || !HUGGINGFACE_API_KEY) {
            return res.status(500).json({ error: 'API Keys are not configured on the server.' });
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const generativeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const hf = new HfInference(HUGGINGFACE_API_KEY);

        // 1. Generate an optimized image generation prompt from the dream text
        const promptGen = await generativeModel.generateContent(`Create a short, descriptive 1-sentence prompt for an AI image generator (like Midjourney or DALL-E) based on this dream. Aim for a surreal, cinematic, mystical, and beautiful aesthetic. The dream is: "${text}". Reply ONLY with the English image prompt. Do NOT include any prefixes like "Prompt:".`);
        const imagePrompt = promptGen.response.text().trim();

        // 2. Request the image from Hugging Face
        const imageBlob = await hf.textToImage({
            model: 'stabilityai/stable-diffusion-xl-base-1.0',
            inputs: imagePrompt,
            parameters: { negative_prompt: "blurry, poor quality, text, words, watermark, ugly" }
        }) as Blob;

        // 3. Convert blob to base64 Data URI
        const arrayBuffer = await imageBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:${imageBlob.type};base64,${buffer.toString('base64')}`;
        
        res.json({ imageUrl: base64Image });
    } catch (error) {
        console.error('AI Image Error:', error);
        res.status(500).json({ error: 'Failed to generate image from AI.' });
    }
});

export default router;
