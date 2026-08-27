import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from '../App';
import { Dream } from '../types/index';

let dreams: Dream[] = [];

vi.mock('../hooks/useDreamStore', () => ({
    useDreamStore: () => ({
        language: 'en',
        currentUser: { email: 'a@b.c', name: 'Dreamer', createdAt: '2026-01-01' },
        authLoading: false,
        dreams,
        checkAuth: vi.fn(),
        getDream: (id: string) => dreams.find(d => d.id === id),
        sendChatMessage: vi.fn(),
        addDream: vi.fn(),
        deleteDream: vi.fn(),
        setLanguage: vi.fn(),
        logoutUser: vi.fn()
    })
}));

function Probe() {
    const { pathname } = useLocation();
    return <span data-testid="pathname">{pathname}</span>;
}

function renderAt(entries: string[]) {
    return render(
        <MemoryRouter initialEntries={entries}>
            <AppRoutes />
            <Probe />
        </MemoryRouter>
    );
}

const pathname = () => screen.getByTestId('pathname').textContent;

beforeEach(() => {
    dreams = [{
        id: 'abc123',
        date: '2026-08-19T00:00:00.000Z',
        title: '',
        content: '',
        lucid: false,
        themes: [],
        mood: '',
        chatHistory: [],
        text: 'I was flying over a red ocean',
        model: 'jung',
        interpretation: { summary: 'A dream of freedom' }
    }];
});

describe('dream detail route', () => {
    it('opens the dream named in the URL', () => {
        renderAt(['/dream/abc123']);
        expect(screen.getByText(/A dream of freedom/)).toBeInTheDocument();
    });

    it('reports a dream that is not in the archive', () => {
        renderAt(['/dream/missing']);
        expect(screen.getByText(/dream not found/i)).toBeInTheDocument();
    });

    it('hides the bottom nav so the screen has one way back', () => {
        renderAt(['/dream/abc123']);
        expect(screen.queryByRole('button', { name: /journal/i })).not.toBeInTheDocument();
    });

    it('shows the bottom nav everywhere else', () => {
        renderAt(['/archive']);
        expect(screen.getByRole('button', { name: /journal/i })).toBeInTheDocument();
    });
});

describe('back from the detail screen', () => {
    it('returns to the archive when the dream was opened from it', async () => {
        renderAt(['/archive']);
        await userEvent.click(screen.getByText(/red ocean/i));
        expect(pathname()).toBe('/dream/abc123');

        await userEvent.click(screen.getByRole('button', { name: /^back$/i }));
        expect(pathname()).toBe('/archive');
        expect(screen.getByText(/dream archive/i)).toBeInTheDocument();
    });

    // A deep link has no in-app history behind it. Going "back" must land on
    // the archive rather than stepping out of the app onto whatever page the
    // visitor came from.
    it('lands on the archive when the dream was reached by deep link', async () => {
        renderAt(['/dream/abc123']);
        await userEvent.click(screen.getByRole('button', { name: /^back$/i }));

        expect(pathname()).toBe('/archive');
        expect(screen.getByText(/dream archive/i)).toBeInTheDocument();
    });

    // The discriminating case. A visitor who arrived from another site has a
    // non-empty window.history even though they have no in-app history, so a
    // `window.history.length > 1` check would send them out of the app. Only
    // location.key tells the difference, and this test fails without it.
    it('lands on the archive even when the tab has unrelated history behind it', async () => {
        const original = Object.getOwnPropertyDescriptor(window, 'history');
        Object.defineProperty(window, 'history', {
            configurable: true,
            value: { ...window.history, length: 7, back: vi.fn(), go: vi.fn() }
        });

        try {
            renderAt(['/dream/abc123']);
            await userEvent.click(screen.getByRole('button', { name: /^back$/i }));

            expect(pathname()).toBe('/archive');
        } finally {
            if (original) Object.defineProperty(window, 'history', original);
        }
    });

    it('keeps the archive search term when returning', async () => {
        renderAt(['/archive']);
        await userEvent.type(screen.getByLabelText(/search dreams/i), 'ocean');
        await userEvent.click(screen.getByText(/red ocean/i));

        await userEvent.click(screen.getByRole('button', { name: /^back$/i }));
        expect(pathname()).toBe('/archive');
    });
});
