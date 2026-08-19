import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    apiFetch, apiLogin, apiRegister, apiGetMe,
    getToken, setToken, removeToken, setUnauthorizedHandler
} from './authApi';

function respond(body: string | null, init: { status?: number; contentType?: string | null } = {}) {
    const { status = 200, contentType = 'application/json' } = init;
    const headers = new Headers();
    if (contentType) headers.set('content-type', contentType);
    return new Response(body, { status, headers });
}

const json = (value: unknown, status = 200) => respond(JSON.stringify(value), { status });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setUnauthorizedHandler(null);
    removeToken();
});

afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
});

describe('token storage', () => {
    it('round-trips and clears the token', () => {
        expect(getToken()).toBeNull();
        setToken('abc');
        expect(getToken()).toBe('abc');
        removeToken();
        expect(getToken()).toBeNull();
    });
});

describe('apiFetch headers', () => {
    it('sends JSON content type and no auth header when signed out', async () => {
        fetchMock.mockResolvedValue(json({ ok: true }));
        await apiFetch('/api/thing');

        const headers = fetchMock.mock.calls[0][1].headers;
        expect(headers['Content-Type']).toBe('application/json');
        expect(headers.Authorization).toBeUndefined();
    });

    it('attaches the bearer token when one is stored', async () => {
        setToken('tok123');
        fetchMock.mockResolvedValue(json({ ok: true }));
        await apiFetch('/api/thing');

        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok123');
    });

    it('lets a caller override a header', async () => {
        fetchMock.mockResolvedValue(json({ ok: true }));
        await apiFetch('/api/thing', { headers: { 'Content-Type': 'text/plain' } });

        expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('text/plain');
    });
});

describe('apiFetch body handling', () => {
    it('parses a JSON body', async () => {
        fetchMock.mockResolvedValue(json({ hello: 'world' }));
        await expect(apiFetch('/api/thing')).resolves.toEqual({ hello: 'world' });
    });

    // Regression: response.json() was called unconditionally, so any non-JSON
    // reply threw SyntaxError and the real status was lost.
    it('does not throw SyntaxError on an HTML error page', async () => {
        fetchMock.mockResolvedValue(
            respond('<html><body>502 Bad Gateway</body></html>', { status: 502, contentType: 'text/html' })
        );

        await expect(apiFetch('/api/thing')).rejects.toThrow('Request failed (502)');
    });

    it('does not throw on the SPA index.html a catch-all route returns', async () => {
        fetchMock.mockResolvedValue(
            respond('<!doctype html><div id="root"></div>', { status: 404, contentType: 'text/html' })
        );

        await expect(apiFetch('/api/typo')).rejects.toThrow('Request failed (404)');
    });

    it('handles an empty 204 without trying to parse it', async () => {
        fetchMock.mockResolvedValue(respond(null, { status: 204, contentType: null }));
        await expect(apiFetch('/api/thing', { method: 'DELETE' })).resolves.toBeNull();
    });

    it('handles a body that claims JSON but is not', async () => {
        fetchMock.mockResolvedValue(respond('not json at all'));
        await expect(apiFetch('/api/thing')).resolves.toBe('not json at all');
    });
});

describe('apiFetch errors', () => {
    it('prefers the server error message', async () => {
        fetchMock.mockResolvedValue(json({ error: 'Invalid credentials.' }, 401));
        await expect(apiFetch('/api/thing')).rejects.toThrow('Invalid credentials.');
    });

    it('falls back to the status when there is no message', async () => {
        fetchMock.mockResolvedValue(json({}, 500));
        await expect(apiFetch('/api/thing')).rejects.toThrow('Request failed (500)');
    });

    it('surfaces the rate limiter message', async () => {
        fetchMock.mockResolvedValue(json({ error: 'Too many attempts. Please try again later.' }, 429));
        await expect(apiFetch('/api/auth/login')).rejects.toThrow(/too many attempts/i);
    });
});

describe('401 handling', () => {
    it('clears the stored token and notifies the app', async () => {
        setToken('expired');
        const onUnauthorized = vi.fn();
        setUnauthorizedHandler(onUnauthorized);
        fetchMock.mockResolvedValue(json({ error: 'Invalid or expired token.' }, 401));

        await expect(apiFetch('/api/dreams')).rejects.toThrow(/invalid or expired/i);

        expect(getToken()).toBeNull();
        expect(onUnauthorized).toHaveBeenCalledOnce();
    });

    it('does not fire when there was no token to begin with', async () => {
        const onUnauthorized = vi.fn();
        setUnauthorizedHandler(onUnauthorized);
        fetchMock.mockResolvedValue(json({ error: 'Access denied. No token provided.' }, 401));

        await expect(apiFetch('/api/dreams')).rejects.toThrow(/access denied/i);
        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('leaves the token alone on other failures', async () => {
        setToken('still-good');
        fetchMock.mockResolvedValue(json({ error: 'Internal server error.' }, 500));

        await expect(apiFetch('/api/dreams')).rejects.toThrow();
        expect(getToken()).toBe('still-good');
    });
});

describe('auth endpoints', () => {
    it('stores the token returned by register', async () => {
        fetchMock.mockResolvedValue(json({ token: 'new-token', user: { email: 'a@b.c' } }, 201));
        const user = await apiRegister('A', 'a@b.c', 'secret123');

        expect(user).toEqual({ email: 'a@b.c' });
        expect(getToken()).toBe('new-token');
    });

    it('stores the token returned by login', async () => {
        fetchMock.mockResolvedValue(json({ token: 'login-token', user: { email: 'a@b.c' } }));
        await apiLogin('a@b.c', 'secret123');
        expect(getToken()).toBe('login-token');
    });

    it('does not store a token when login fails', async () => {
        fetchMock.mockResolvedValue(json({ error: 'Invalid credentials.' }, 401));
        await expect(apiLogin('a@b.c', 'wrong')).rejects.toThrow();
        expect(getToken()).toBeNull();
    });

    it('returns the profile from me', async () => {
        setToken('tok');
        fetchMock.mockResolvedValue(json({ user: { email: 'a@b.c', name: 'Dreamer' } }));
        await expect(apiGetMe()).resolves.toEqual({ email: 'a@b.c', name: 'Dreamer' });
    });
});
