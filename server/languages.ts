// Canonical language table for AI prompts.
//
// The prompt used to read `language === 'mk' ? 'Macedonian' : 'English'`, so
// every one of the other nineteen options in the picker silently produced an
// English interpretation. Gemini needs the language named in English; this
// maps the picker's codes onto those names.
//
// Keep in step with LANGUAGES in src/utils/translations.ts. A test asserts the
// two lists agree, so adding a language to one without the other fails the
// build rather than quietly regressing to English.

export const LANGUAGE_NAMES: Record<string, string> = {
    en: 'English',
    mk: 'Macedonian',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    ru: 'Russian',
    zh: 'Simplified Chinese',
    tr: 'Turkish',
    ar: 'Arabic',
    hi: 'Hindi',
    uk: 'Ukrainian',
    be: 'Belarusian',
    pl: 'Polish',
    cs: 'Czech',
    sk: 'Slovak',
    sl: 'Slovenian',
    sr: 'Serbian',
    hr: 'Croatian',
    bg: 'Bulgarian',
    el: 'Greek'
};

export const DEFAULT_LANGUAGE = 'en';

/**
 * Resolves a picker code to the English name of that language.
 * Unknown or missing codes fall back to English rather than producing a
 * prompt that asks for a language the model cannot identify.
 */
export function languageName(code: unknown): string {
    if (typeof code !== 'string') return LANGUAGE_NAMES[DEFAULT_LANGUAGE];
    return LANGUAGE_NAMES[code.toLowerCase().trim()] ?? LANGUAGE_NAMES[DEFAULT_LANGUAGE];
}

/** Normalises a picker code, falling back to the default. */
export function languageCode(code: unknown): string {
    if (typeof code !== 'string') return DEFAULT_LANGUAGE;
    const normalised = code.toLowerCase().trim();
    return normalised in LANGUAGE_NAMES ? normalised : DEFAULT_LANGUAGE;
}
