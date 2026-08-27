import { describe, it, expect } from 'vitest';
import { LANGUAGES, translations } from './translations';
import { LANGUAGE_NAMES, languageName, languageCode } from '../../server/languages';

// This test lives in the frontend project because it is the only place that
// can see both lists. Its job is to fail loudly when someone adds a language
// to the picker without telling the AI prompt about it -- the exact drift that
// made nineteen of the twenty-one options silently return English.
describe('language table parity', () => {
    it('gives every language in the picker an English name for the prompt', () => {
        for (const { code, label } of LANGUAGES) {
            expect(LANGUAGE_NAMES[code], `${label} (${code}) has no prompt name`).toBeTruthy();
        }
    });

    it('does not name a language the picker does not offer', () => {
        const offered = new Set(LANGUAGES.map(l => l.code));
        for (const code of Object.keys(LANGUAGE_NAMES)) {
            expect(offered.has(code), `${code} is named but not offered`).toBe(true);
        }
    });

    it('matches the translations table one for one', () => {
        expect(Object.keys(LANGUAGE_NAMES).sort()).toEqual(Object.keys(translations).sort());
    });
});

describe('languageName', () => {
    it('resolves the codes the app actually sends', () => {
        expect(languageName('mk')).toBe('Macedonian');
        expect(languageName('en')).toBe('English');
        expect(languageName('es')).toBe('Spanish');
        expect(languageName('zh')).toBe('Simplified Chinese');
    });

    it('is tolerant of casing and stray whitespace', () => {
        expect(languageName('MK')).toBe('Macedonian');
        expect(languageName('  fr  ')).toBe('French');
    });

    it('falls back to English rather than naming a language the model cannot identify', () => {
        expect(languageName('klingon')).toBe('English');
        expect(languageName('')).toBe('English');
        expect(languageName(undefined)).toBe('English');
        expect(languageName(null)).toBe('English');
        expect(languageName(42)).toBe('English');
    });
});

describe('languageCode', () => {
    it('normalises a known code', () => {
        expect(languageCode('MK')).toBe('mk');
        expect(languageCode(' de ')).toBe('de');
    });

    it('falls back to en for anything unrecognised', () => {
        expect(languageCode('xx')).toBe('en');
        expect(languageCode(undefined)).toBe('en');
        expect(languageCode({})).toBe('en');
    });
});
