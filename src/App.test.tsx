import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

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
        logoutUser: vi.fn()
    })
}));

beforeEach(() => {
    checkAuth.mockClear();
});

describe('App navigation', () => {
    it('validates the stored token on mount', () => {
        render(<App />);
        expect(checkAuth).toHaveBeenCalled();
    });

    // Regression: navigate() defaulted params to null, and JS default
    // parameters only fire on undefined, so AddDreamScreen never received
    // initialMode="write" and rendered neither the textarea nor the mic.
    it('shows the write form when Add is reached from the bottom nav', async () => {
        render(<App />);
        await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

        expect(screen.getByPlaceholderText(/describe your dream/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /interpret dream/i })).toBeInTheDocument();
    });

    it('shows the mic when Record is chosen from the home screen', async () => {
        render(<App />);
        await userEvent.click(screen.getByText(/record dream/i));

        expect(screen.getByText(/tap to speak/i)).toBeInTheDocument();
        expect(screen.queryByPlaceholderText(/describe your dream/i)).not.toBeInTheDocument();
    });

    it('shows the textarea when Write is chosen from the home screen', async () => {
        render(<App />);
        await userEvent.click(screen.getByText(/write dream/i));

        expect(screen.getByPlaceholderText(/describe your dream/i)).toBeInTheDocument();
        expect(screen.queryByText(/tap to speak/i)).not.toBeInTheDocument();
    });

    it('navigates to the archive and back home', async () => {
        render(<App />);
        await userEvent.click(screen.getByRole('button', { name: /journal/i }));
        expect(screen.getByText(/dream archive/i)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /^back$/i }));
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    it('keeps the bottom nav on every screen except the detail view', async () => {
        render(<App />);
        expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /journal/i }));
        expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
    });
});

describe('App auth guard', () => {
    it('shows the login screen while no user is loaded', async () => {
        vi.resetModules();
        vi.doMock('./hooks/useDreamStore', () => ({
            useDreamStore: () => ({
                language: 'en',
                currentUser: null,
                authLoading: false,
                dreams: [],
                checkAuth: vi.fn(),
                loginUser: vi.fn(),
                registerUser: vi.fn()
            })
        }));
        const { default: FreshApp } = await import('./App');
        render(<FreshApp />);
        expect(screen.getByText(/join dreamoff/i)).toBeInTheDocument();
    });

    it('shows a loading state while the token is being checked', async () => {
        vi.resetModules();
        vi.doMock('./hooks/useDreamStore', () => ({
            useDreamStore: () => ({
                language: 'en',
                currentUser: null,
                authLoading: true,
                dreams: [],
                checkAuth: vi.fn()
            })
        }));
        const { default: FreshApp } = await import('./App');
        render(<FreshApp />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
});
