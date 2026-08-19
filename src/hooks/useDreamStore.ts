import { useSyncExternalStore } from 'react';
import { apiRegister, apiLogin, apiGetMe, removeToken, getToken, setUnauthorizedHandler } from '../services/authApi';
import { fetchDreams, createDream, deleteDreamApi } from '../services/dreamsApi';
import { Dream, User, errorMessage } from '../types/index';

// ============================================================
// 1. Global State (Singleton)
// ============================================================
const STORAGE_KEY = 'dream_diary_v1';

interface StoreState {
    dreams: Dream[];
    currentUser: User | null;
    authLoading: boolean;
    language: string;
}

let memoryState: StoreState = {
    dreams: [],
    currentUser: null,   // Set after token validation
    authLoading: true,   // True until initial token check completes
    language: 'en'
};

// Load persisted dreams and language only (NOT users/auth)
try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.language) memoryState.language = parsed.language;
    }
} catch (e) {
    console.error('Failed to load store', e);
}

// ============================================================
// 2. Listeners
// ============================================================
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// ============================================================
// 3. Actions
// ============================================================

// Persist only dreams and language — auth is handled by JWT
const persist = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        language: memoryState.language
    }));
};

const notify = () => {
    persist();
    listeners.forEach(l => l());
};

const store = {
    getSnapshot: () => memoryState,

    setLanguage: (lang: string) => {
        memoryState = { ...memoryState, language: lang };
        notify();
    },

    // ── Auth actions (async, calling backend API) ──

    registerUser: async (name: string, email: string, password: string): Promise<{success: boolean; error?: string}> => {
        try {
            const user = await apiRegister(name, email, password);
            const dreams = await fetchDreams().catch(() => []);
            memoryState = { ...memoryState, currentUser: user, dreams };
            notify();
            return { success: true };
        } catch (err) {
            return { success: false, error: errorMessage(err) };
        }
    },

    loginUser: async (email: string, password: string): Promise<{success: boolean; error?: string}> => {
        try {
            const user = await apiLogin(email, password);
            const dreams = await fetchDreams().catch(() => []);
            memoryState = { ...memoryState, currentUser: user, dreams };
            notify();
            return { success: true };
        } catch (err) {
            return { success: false, error: errorMessage(err) };
        }
    },

    logoutUser: () => {
        removeToken();
        memoryState = { ...memoryState, currentUser: null, dreams: [] };
        notify();
    },

    // Validate JWT on app mount — keeps user logged in across refresh
    checkAuth: async () => {
        const token = getToken();
        if (!token) {
            memoryState = { ...memoryState, authLoading: false, currentUser: null };
            listeners.forEach(l => l());
            return;
        }
        try {
            const user = await apiGetMe();
            const dreams = await fetchDreams().catch(() => []);
            memoryState = { ...memoryState, currentUser: user, dreams, authLoading: false };
        } catch {
            removeToken();
            memoryState = { ...memoryState, currentUser: null, dreams: [], authLoading: false };
        }
        listeners.forEach(l => l());
    },

    // ── Dream actions (unchanged, still localStorage) ──

    addDream: async (dream: Partial<Dream>): Promise<Dream> => {
        try {
            const newDream = await createDream(dream);
            memoryState = {
                ...memoryState,
                dreams: [newDream, ...memoryState.dreams]
            };
            notify();
            return newDream;
        } catch (err) {
            console.error('Failed to save to DB:', err);
            // Optional: Handle error gracefully, e.g., show a toast.
            throw err;
        }
    },

    deleteDream: async (id: string) => {
        try {
            await deleteDreamApi(id);
            memoryState = {
                ...memoryState,
                dreams: memoryState.dreams.filter(d => d.id !== id)
            };
            notify();
        } catch (err) {
            console.error('Failed to delete from DB:', err);
        }
    },

    getDream: (id: string) => memoryState.dreams.find(d => d.id === id)
};

// Any request that comes back 401 means the token is gone or rejected.
// apiFetch has already cleared it; drop the session so the auth guard sends
// the user to the login screen instead of leaving them on a dead screen.
setUnauthorizedHandler(() => {
    if (!memoryState.currentUser) return;
    memoryState = { ...memoryState, currentUser: null, dreams: [] };
    notify();
});

// ============================================================
// 4. The Hook
// ============================================================
export function useDreamStore() {
    const state = useSyncExternalStore(subscribe, store.getSnapshot);

    return {
        // State
        dreams: state.dreams,
        language: state.language,
        currentUser: state.currentUser,
        authLoading: state.authLoading,

        // Actions
        setLanguage: store.setLanguage,
        registerUser: store.registerUser,
        loginUser: store.loginUser,
        logoutUser: store.logoutUser,
        checkAuth: store.checkAuth,

        addDream: store.addDream,
        deleteDream: store.deleteDream,
        getDream: store.getDream
    };
}
