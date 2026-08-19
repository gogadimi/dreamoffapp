import { describe, it, expect } from 'vitest';
import { t, translations, LANGUAGES } from './translations';

describe('t()', () => {
    it('returns the string for a complete locale', () => {
        expect(t('mk', 'home')).toBe(translations.mk.home);
        expect(t('en', 'home')).toBe('Home');
    });

    it('falls back to English for a key the locale is missing', () => {
        // Spanish has ~16 of the ~40 keys; "transcription" is not one of them.
        expect('transcription' in translations.es).toBe(false);
        expect(t('es', 'transcription')).toBe(translations.en.transcription);
    });

    it('falls back to English for an unknown locale', () => {
        expect(t('xx', 'home')).toBe('Home');
    });

    it('returns the key itself when nothing has a translation', () => {
        expect(t('en', 'no_such_key')).toBe('no_such_key');
    });

    it('never returns undefined for any advertised language', () => {
        const keys = Object.keys(translations.en) as (keyof typeof translations.en)[];
        for (const { code } of LANGUAGES) {
            for (const key of keys) {
                const value = t(code, key);
                expect(typeof value, `${code}.${key}`).toBe('string');
                expect(value.length, `${code}.${key}`).toBeGreaterThan(0);
            }
        }
    });

    // Documents a real gap rather than asserting the bug is fine: HomeScreen
    // calls t(language, 'welcome') and no locale defines it, so the raw key
    // leaks into the UI as lowercase "welcome".
    it('has no "welcome" key, which HomeScreen still asks for', () => {
        expect('welcome' in translations.en).toBe(false);
        expect(t('en', 'welcome')).toBe('welcome');
    });
});

describe('LANGUAGES', () => {
    it('has a unique code per entry', () => {
        const codes = LANGUAGES.map(l => l.code);
        expect(new Set(codes).size).toBe(codes.length);
    });

    it('only advertises languages that have a translations entry', () => {
        for (const { code } of LANGUAGES) {
            expect(translations, `missing translations.${code}`).toHaveProperty(code);
        }
    });
});
