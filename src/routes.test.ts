import { describe, it, expect } from 'vitest';
import { paths, pathFor, activeScreen } from './routes';

describe('pathFor', () => {
    it('maps every screen the app navigates to', () => {
        expect(pathFor('home')).toBe('/');
        expect(pathFor('archive')).toBe('/archive');
        expect(pathFor('models')).toBe('/models');
        expect(pathFor('profile')).toBe('/profile');
    });

    it('carries the add mode into the path', () => {
        expect(pathFor('add', 'record')).toBe('/add/record');
        expect(pathFor('add', 'write')).toBe('/add/write');
    });

    // Regression from step 1, now at the routing layer: an omitted mode must
    // land on write rather than on a screen with neither textarea nor mic.
    it('defaults add to write when no mode is given', () => {
        expect(pathFor('add')).toBe('/add/write');
        expect(pathFor('add', undefined)).toBe('/add/write');
        expect(pathFor('add', null)).toBe('/add/write');
        expect(pathFor('add', 'nonsense')).toBe('/add/write');
    });

    it('builds a dream detail path from an id', () => {
        expect(pathFor('detail', 'abc123')).toBe('/dream/abc123');
    });

    it('escapes an id that would otherwise break the path', () => {
        expect(pathFor('detail', 'a/b?c')).toBe('/dream/a%2Fb%3Fc');
    });

    it('falls back to the archive when a detail has no id', () => {
        expect(pathFor('detail')).toBe('/archive');
        expect(pathFor('detail', '')).toBe('/archive');
        expect(pathFor('detail', 42)).toBe('/archive');
    });

    it('sends an unknown screen home rather than nowhere', () => {
        expect(pathFor('does-not-exist')).toBe('/');
    });
});

describe('activeScreen', () => {
    it('identifies each top-level screen', () => {
        expect(activeScreen('/')).toBe('home');
        expect(activeScreen('/archive')).toBe('archive');
        expect(activeScreen('/models')).toBe('models');
        expect(activeScreen('/profile')).toBe('profile');
    });

    it('treats both add modes as the same nav item', () => {
        expect(activeScreen('/add/record')).toBe('add');
        expect(activeScreen('/add/write')).toBe('add');
        expect(activeScreen('/add')).toBe('add');
    });

    it('recognises a dream detail path', () => {
        expect(activeScreen('/dream/abc123')).toBe('detail');
    });

    it('highlights nothing for a path outside the app', () => {
        expect(activeScreen('/login')).toBeNull();
        expect(activeScreen('/no/such/page')).toBeNull();
    });

    it('does not mistake a longer path for home', () => {
        expect(activeScreen('/archive')).not.toBe('home');
        expect(activeScreen('/profile')).not.toBe('home');
    });
});

describe('paths and pathFor agree', () => {
    it('produces the same strings from both directions', () => {
        expect(pathFor('home')).toBe(paths.home);
        expect(pathFor('archive')).toBe(paths.archive);
        expect(pathFor('models')).toBe(paths.models);
        expect(pathFor('profile')).toBe(paths.profile);
        expect(pathFor('add', 'record')).toBe(paths.add('record'));
        expect(pathFor('detail', 'x')).toBe(paths.detail('x'));
    });

    it('round-trips every navigable screen back to itself', () => {
        for (const screen of ['home', 'archive', 'models', 'profile'] as const) {
            expect(activeScreen(pathFor(screen))).toBe(screen);
        }
        expect(activeScreen(pathFor('add', 'record'))).toBe('add');
        expect(activeScreen(pathFor('detail', 'abc'))).toBe('detail');
    });
});
