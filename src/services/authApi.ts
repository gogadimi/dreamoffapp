// Authentication API client
// Handles token storage and API calls to the Express backend.
// All /api/* requests go through Vite's proxy in dev (-> localhost:5001).

const API_BASE = '/api/auth';
const TOKEN_KEY = 'dreamoff_token';

// ── Token management ──

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

// ── Unauthorized handling ──

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

/**
 * Registered by the store so a rejected token clears the session instead of
 * leaving the user staring at a screen where every request fails.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
    onUnauthorized = handler;
}

// ── Fetch helper with auto Bearer header ──

/**
 * Reads a response body without assuming it is JSON.
 *
 * A blind response.json() throws SyntaxError on an empty 204, on the SPA
 * index.html returned by the catch-all route, and on any HTML error page a
 * reverse proxy injects -- losing the real status in the process.
 */
async function readBody(response: Response): Promise<unknown> {
    if (response.status === 204) return null;

    const text = await response.text();
    if (!text) return null;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return text;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function errorFrom(body: unknown, status: number): string {
    if (body && typeof body === 'object' && 'error' in body) {
        const message = (body as { error?: unknown }).error;
        if (typeof message === 'string' && message) return message;
    }
    return `Request failed (${status})`;
}

export async function apiFetch(url: string, options: RequestInit = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    const body = await readBody(response);

    if (!response.ok) {
        // The token is gone or no longer valid: drop it and let the app fall
        // back to the login screen rather than retrying forever.
        if (response.status === 401 && token) {
            removeToken();
            onUnauthorized?.();
        }
        throw new Error(errorFrom(body, response.status));
    }

    // Deliberate: this is the untyped JSON boundary. Callers such as
    // dreamsApi declare the concrete shape they expect.
    return body as any;
}

// ── API functions ──

export async function apiRegister(name: string, email: string, password: string) {
    const data = await apiFetch(`${API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
    setToken(data.token);
    return data.user;
}

export async function apiLogin(email: string, password: string) {
    const data = await apiFetch(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    return data.user;
}

export async function apiGetMe() {
    const data = await apiFetch(`${API_BASE}/me`);
    return data.user;
}
