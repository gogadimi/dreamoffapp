import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Dream, User } from '../types/index';

const apiRegister = vi.fn();
const apiLogin = vi.fn();
const apiGetMe = vi.fn();
const removeToken = vi.fn();
const getToken = vi.fn();
const fetchDreams = vi.fn();
const createDream = vi.fn();
const deleteDreamApi = vi.fn();

vi.mock('../services/authApi', () => ({ apiRegister, apiLogin, apiGetMe, removeToken, getToken }));
vi.mock('../services/dreamsApi', () => ({ fetchDreams, createDream, deleteDreamApi }));

const user: User = { email: 'a@b.c', name: 'Dreamer', createdAt: '2026-01-01' };

const dream = (id: string): Dream => ({
    id, date: '2026-08-19', title: '', content: '', lucid: false,
    themes: [], mood: '', chatHistory: [], text: `dream ${id}`
});

/** The store is a module singleton, so each test needs a fresh module graph. */
async function freshStore() {
    vi.resetModules();
    const mod = await import('./useDreamStore');
    return renderHook(() => mod.useDreamStore());
}

beforeEach(() => {
    vi.clearAllMocks();
    getToken.mockReturnValue(null);
    fetchDreams.mockResolvedValue([]);
});

describe('checkAuth', () => {
    it('clears loading and stays logged out with no token', async () => {
        const { result } = await freshStore();
        await act(async () => { await result.current.checkAuth(); });

        expect(apiGetMe).not.toHaveBeenCalled();
        expect(result.current.currentUser).toBeNull();
        expect(result.current.authLoading).toBe(false);
    });

    it('restores the session when the token is still valid', async () => {
        getToken.mockReturnValue('tok');
        apiGetMe.mockResolvedValue(user);
        fetchDreams.mockResolvedValue([dream('1')]);

        const { result } = await freshStore();
        await act(async () => { await result.current.checkAuth(); });

        expect(result.current.currentUser).toEqual(user);
        expect(result.current.dreams).toHaveLength(1);
        expect(result.current.authLoading).toBe(false);
    });

    it('drops a rejected token instead of leaving the app stuck', async () => {
        getToken.mockReturnValue('expired');
        apiGetMe.mockRejectedValue(new Error('Invalid or expired token.'));

        const { result } = await freshStore();
        await act(async () => { await result.current.checkAuth(); });

        expect(removeToken).toHaveBeenCalled();
        expect(result.current.currentUser).toBeNull();
        expect(result.current.authLoading).toBe(false);
    });
});

describe('login and register', () => {
    it('reports the server message on failure rather than throwing', async () => {
        apiLogin.mockRejectedValue(new Error('Invalid credentials.'));
        const { result } = await freshStore();

        let outcome: { success: boolean; error?: string } | undefined;
        await act(async () => { outcome = await result.current.loginUser('a@b.c', 'nope'); });

        expect(outcome).toEqual({ success: false, error: 'Invalid credentials.' });
        expect(result.current.currentUser).toBeNull();
    });

    it('survives a rejection that is not an Error', async () => {
        apiLogin.mockRejectedValue('just a string');
        const { result } = await freshStore();

        let outcome: { success: boolean; error?: string } | undefined;
        await act(async () => { outcome = await result.current.loginUser('a@b.c', 'x'); });

        expect(outcome?.success).toBe(false);
        expect(typeof outcome?.error).toBe('string');
    });

    it('loads dreams after a successful register', async () => {
        apiRegister.mockResolvedValue(user);
        fetchDreams.mockResolvedValue([dream('1'), dream('2')]);
        const { result } = await freshStore();

        await act(async () => { await result.current.registerUser('Dreamer', 'a@b.c', 'secret123'); });

        expect(result.current.currentUser).toEqual(user);
        expect(result.current.dreams).toHaveLength(2);
    });

    it('still signs the user in when the dream fetch fails', async () => {
        apiLogin.mockResolvedValue(user);
        fetchDreams.mockRejectedValue(new Error('network'));
        const { result } = await freshStore();

        await act(async () => { await result.current.loginUser('a@b.c', 'secret123'); });

        expect(result.current.currentUser).toEqual(user);
        expect(result.current.dreams).toEqual([]);
    });
});

describe('dreams', () => {
    it('prepends a new dream so the newest is first', async () => {
        apiLogin.mockResolvedValue(user);
        fetchDreams.mockResolvedValue([dream('old')]);
        createDream.mockResolvedValue(dream('new'));
        const { result } = await freshStore();

        await act(async () => { await result.current.loginUser('a@b.c', 'x'); });
        await act(async () => { await result.current.addDream({ text: 'new' }); });

        expect(result.current.dreams.map(d => d.id)).toEqual(['new', 'old']);
    });

    it('propagates an add failure instead of silently dropping the dream', async () => {
        createDream.mockRejectedValue(new Error('Internal server error'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { result } = await freshStore();

        let caught: unknown;
        await act(async () => {
            await result.current.addDream({ text: 'x' }).catch((e: unknown) => { caught = e; });
        });

        expect((caught as Error)?.message).toBe('Internal server error');
        expect(result.current.dreams).toEqual([]);
    });

    it('removes a dream locally once the server confirms', async () => {
        apiLogin.mockResolvedValue(user);
        fetchDreams.mockResolvedValue([dream('1'), dream('2')]);
        deleteDreamApi.mockResolvedValue({ success: true, id: '1' });
        const { result } = await freshStore();

        await act(async () => { await result.current.loginUser('a@b.c', 'x'); });
        await act(async () => { await result.current.deleteDream('1'); });

        expect(result.current.dreams.map(d => d.id)).toEqual(['2']);
    });

    it('keeps the dream when the server refuses to delete it', async () => {
        apiLogin.mockResolvedValue(user);
        fetchDreams.mockResolvedValue([dream('1')]);
        deleteDreamApi.mockRejectedValue(new Error('Dream not found'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { result } = await freshStore();

        await act(async () => { await result.current.loginUser('a@b.c', 'x'); });
        await act(async () => { await result.current.deleteDream('1'); });

        expect(result.current.dreams).toHaveLength(1);
    });
});

describe('logout', () => {
    it('clears the token, the user and the cached dreams', async () => {
        apiLogin.mockResolvedValue(user);
        fetchDreams.mockResolvedValue([dream('1')]);
        const { result } = await freshStore();

        await act(async () => { await result.current.loginUser('a@b.c', 'x'); });
        act(() => { result.current.logoutUser(); });

        expect(removeToken).toHaveBeenCalled();
        expect(result.current.currentUser).toBeNull();
        expect(result.current.dreams).toEqual([]);
    });
});

describe('language', () => {
    it('persists the choice and reloads it on the next session', async () => {
        const { result } = await freshStore();
        act(() => { result.current.setLanguage('mk'); });
        expect(result.current.language).toBe('mk');

        const { result: reloaded } = await freshStore();
        expect(reloaded.current.language).toBe('mk');
    });

    it('never writes auth state to localStorage', async () => {
        apiLogin.mockResolvedValue(user);
        const { result } = await freshStore();
        await act(async () => { await result.current.loginUser('a@b.c', 'x'); });

        const stored = localStorage.getItem('dream_diary_v1') ?? '';
        expect(stored).not.toContain('a@b.c');
        expect(stored).not.toContain('Dreamer');
    });
});
