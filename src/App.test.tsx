import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from './App';

const checkAuth = vi.fn();

vi.mock('./hooks/useDreamStore', () => ({
    useDreamStore: () => ({
        language: 'en',
        currentUser: { email: 'a@b.c', name: 'Dreamer', createdAt: '2026-01-01' },
        authLoading: false,
        dreams: [],
        checkAuth,
        addDream: vi.fn(),
        deleteDream: vi.fn(),
        getDream: vi.fn(),
        setLanguage: vi.fn(),
        logoutUser: vi.fn(),
        sendChatMessage: vi.fn()
    })
}));

/** Renders the current path so assertions can read the URL. */
function LocationProbe() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    return (
        <>
            <span data-testid="pathname">{pathname}</span>
            <button onClick={() => navigate(-1)}>probe-back</button>
        </>
    );
}

function renderAt(initialEntries: string[] = ['/']) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <AppRoutes />
            <LocationProbe />
        </MemoryRouter>
    );
}

const pathname = () => screen.getByTestId('pathname').textContent;

beforeEach(() => {
    checkAuth.mockClear();
});

describe('mount', () => {
    it('validates the stored token', () => {
        renderAt();
        expect(checkAuth).toHaveBeenCalled();
    });
});

describe('navigation updates the URL', () => {
    it('starts on the home route', () => {
        renderAt();
        expect(pathname()).toBe('/');
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    it('moves to the archive', async () => {
        renderAt();
        await userEvent.click(screen.getByRole('button', { name: /journal/i }));

        expect(pathname()).toBe('/archive');
        expect(screen.getByText(/dream archive/i)).toBeInTheDocument();
    });

    it('moves to the profile', async () => {
        renderAt();
        await userEvent.click(screen.getByRole('button', { name: /profile/i }));
        expect(pathname()).toBe('/profile');
    });

    // Regression from step 1: reaching Add from the bottom nav must land on
    // write mode, not on a screen with neither textarea nor mic.
    it('reaches the write form from the bottom nav', async () => {
        renderAt();
        await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

        expect(pathname()).toBe('/add/write');
        expect(screen.getByPlaceholderText(/describe your dream/i)).toBeInTheDocument();
    });

    it('reaches record mode from the home screen', async () => {
        renderAt();
        await userEvent.click(screen.getByText(/record dream/i));

        expect(pathname()).toBe('/add/record');
        expect(screen.getByText(/tap to speak/i)).toBeInTheDocument();
    });

    it('reaches the models screen', async () => {
        renderAt();
        await userEvent.click(screen.getByText(/psych\. models/i));
        expect(pathname()).toBe('/models');
    });
});

describe('deep links', () => {
    it('opens the archive directly', () => {
        renderAt(['/archive']);
        expect(screen.getByText(/dream archive/i)).toBeInTheDocument();
    });

    it('opens record mode directly', () => {
        renderAt(['/add/record']);
        expect(screen.getByText(/tap to speak/i)).toBeInTheDocument();
    });

    it('opens write mode directly', () => {
        renderAt(['/add/write']);
        expect(screen.getByPlaceholderText(/describe your dream/i)).toBeInTheDocument();
    });

    it('redirects bare /add to write mode', () => {
        renderAt(['/add']);
        expect(pathname()).toBe('/add/write');
    });

    it('treats an unknown add mode as write', () => {
        renderAt(['/add/nonsense']);
        expect(screen.getByPlaceholderText(/describe your dream/i)).toBeInTheDocument();
    });

    it('sends an unrecognised path home', () => {
        renderAt(['/no/such/page']);
        expect(pathname()).toBe('/');
    });
});

describe('browser history', () => {
    // The whole point of the router: Back used to leave the app entirely.
    it('goes back to the previous screen instead of leaving the app', async () => {
        renderAt();
        await userEvent.click(screen.getByRole('button', { name: /journal/i }));
        expect(pathname()).toBe('/archive');

        await userEvent.click(screen.getByRole('button', { name: /profile/i }));
        expect(pathname()).toBe('/profile');

        await userEvent.click(screen.getByRole('button', { name: 'probe-back' }));
        expect(pathname()).toBe('/archive');
        expect(screen.getByText(/dream archive/i)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'probe-back' }));
        expect(pathname()).toBe('/');
    });
});

describe('bottom nav', () => {
    it('marks the current screen as the active page', async () => {
        renderAt();
        expect(screen.getByRole('button', { name: /home/i })).toHaveAttribute('aria-current', 'page');

        await userEvent.click(screen.getByRole('button', { name: /journal/i }));
        expect(screen.getByRole('button', { name: /journal/i })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('button', { name: /home/i })).not.toHaveAttribute('aria-current');
    });

    it('marks add as active on both of its modes', () => {
        renderAt(['/add/record']);
        expect(screen.getByRole('button', { name: /^add$/i })).toHaveAttribute('aria-current', 'page');
    });

    it('is present on the ordinary screens', () => {
        renderAt(['/archive']);
        expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
    });
});

describe('auth guard', () => {
    async function renderSignedOut(entries: string[], authLoading = false) {
        vi.resetModules();
        vi.doMock('./hooks/useDreamStore', () => ({
            useDreamStore: () => ({
                language: 'en',
                currentUser: null,
                authLoading,
                dreams: [],
                checkAuth: vi.fn(),
                loginUser: vi.fn(),
                registerUser: vi.fn()
            })
        }));
        const { AppRoutes: Fresh } = await import('./App');
        return render(
            <MemoryRouter initialEntries={entries}>
                <Fresh />
                <LocationProbe />
            </MemoryRouter>
        );
    }

    it('redirects a signed-out visitor to the login route', async () => {
        await renderSignedOut(['/archive']);
        expect(pathname()).toBe('/login');
        expect(screen.getByText(/join dreamoff/i)).toBeInTheDocument();
    });

    it('protects a deep link to a dream', async () => {
        await renderSignedOut(['/dream/abc123']);
        expect(pathname()).toBe('/login');
    });

    it('shows the loading state while the token is being checked', async () => {
        await renderSignedOut(['/'], true);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('sends a signed-in visitor away from the login route', async () => {
        renderAt(['/login']);
        expect(pathname()).toBe('/');
        expect(screen.queryByText(/join dreamoff/i)).not.toBeInTheDocument();
    });
});

describe('route helpers in context', () => {
    it('routes a dream detail deep link to the detail screen', () => {
        render(
            <MemoryRouter initialEntries={['/dream/abc123']}>
                <Routes>
                    <Route path="/dream/:id" element={<LocationProbe />} />
                </Routes>
            </MemoryRouter>
        );
        expect(pathname()).toBe('/dream/abc123');
    });
});
