import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArchiveScreen from './ArchiveScreen';
import { Dream } from '../types/index';

let dreams: Dream[] = [];

vi.mock('../hooks/useDreamStore', () => ({
    useDreamStore: () => ({ dreams, language: 'en' })
}));

function makeDream(overrides: Partial<Dream> = {}): Dream {
    return {
        id: Math.random().toString(36).slice(2),
        date: '2026-08-19T00:00:00.000Z',
        title: '',
        content: '',
        lucid: false,
        themes: [],
        mood: '',
        chatHistory: [],
        ...overrides
    };
}

const search = () => screen.getByLabelText(/search dreams/i);

beforeEach(() => {
    dreams = [
        makeDream({ text: 'I was flying over a red ocean', model: 'jung', themes: ['freedom', 'water'] }),
        makeDream({ text: 'A dark forest full of whispers', model: 'freud', mood: 'anxious' }),
        makeDream({ text: 'Climbing an endless staircase', model: 'cbt', interpretation: { summary: 'Ambition without a summit' } })
    ];
});

describe('empty states', () => {
    it('says there are no dreams when the archive is empty', () => {
        dreams = [];
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        expect(screen.getByText(/no dreams recorded yet/i)).toBeInTheDocument();
    });

    it('does not show a result count with an empty archive', () => {
        dreams = [];
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        expect(screen.queryByText(/dreams found/i)).not.toBeInTheDocument();
    });
});

describe('search', () => {
    // Regression: the input had no value or onChange, so typing did nothing.
    it('filters as you type', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        expect(screen.getByText(/red ocean/i)).toBeInTheDocument();

        await userEvent.type(search(), 'forest');

        expect(screen.getByText(/dark forest/i)).toBeInTheDocument();
        expect(screen.queryByText(/red ocean/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/staircase/i)).not.toBeInTheDocument();
    });

    it('is case insensitive', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        await userEvent.type(search(), 'FOREST');
        expect(screen.getByText(/dark forest/i)).toBeInTheDocument();
    });

    it('matches on the interpretation model', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        await userEvent.type(search(), 'freud');
        expect(screen.getByText(/dark forest/i)).toBeInTheDocument();
        expect(screen.queryByText(/red ocean/i)).not.toBeInTheDocument();
    });

    it('matches on themes', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        await userEvent.type(search(), 'freedom');
        expect(screen.getByText(/red ocean/i)).toBeInTheDocument();
    });

    it('matches on mood', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        await userEvent.type(search(), 'anxious');
        expect(screen.getByText(/dark forest/i)).toBeInTheDocument();
    });

    it('matches inside a structured interpretation', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        await userEvent.type(search(), 'ambition');
        expect(screen.getByText(/staircase/i)).toBeInTheDocument();
    });

    it('narrows rather than widens with more words', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        await userEvent.type(search(), 'flying ocean');
        expect(screen.getByText(/red ocean/i)).toBeInTheDocument();
        expect(screen.queryByText(/dark forest/i)).not.toBeInTheDocument();
    });

    it('ignores surrounding whitespace', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        await userEvent.type(search(), '   forest   ');
        expect(screen.getByText(/dark forest/i)).toBeInTheDocument();
    });

    it('reports when nothing matches, without claiming the archive is empty', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        await userEvent.type(search(), 'zeppelin');

        expect(screen.getByText(/no dreams match/i)).toBeInTheDocument();
        expect(screen.queryByText(/no dreams recorded yet/i)).not.toBeInTheDocument();
    });

    it('shows how many dreams matched', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        await userEvent.type(search(), 'forest');
        expect(screen.getByText('1 dream found')).toBeInTheDocument();

        await userEvent.clear(search());
        await userEvent.type(search(), 'a');
        expect(screen.getByText(/\d+ dreams found/)).toBeInTheDocument();
    });

    it('restores the full list when cleared', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        await userEvent.type(search(), 'forest');
        expect(screen.queryByText(/red ocean/i)).not.toBeInTheDocument();

        await userEvent.click(screen.getByLabelText(/clear search/i));

        expect(screen.getByText(/red ocean/i)).toBeInTheDocument();
        expect(screen.getByText(/dark forest/i)).toBeInTheDocument();
        expect(screen.getByText(/staircase/i)).toBeInTheDocument();
    });

    it('only offers the clear button while searching', async () => {
        render(<ArchiveScreen onNavigate={vi.fn()} />);
        expect(screen.queryByLabelText(/clear search/i)).not.toBeInTheDocument();

        await userEvent.type(search(), 'f');
        expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument();
    });
});

describe('navigation', () => {
    it('opens the dream that was clicked, not the first one', async () => {
        const onNavigate = vi.fn();
        render(<ArchiveScreen onNavigate={onNavigate} />);

        await userEvent.click(screen.getByText(/dark forest/i));
        expect(onNavigate).toHaveBeenCalledWith('detail', dreams[1].id);
    });

    it('opens the right dream after filtering', async () => {
        const onNavigate = vi.fn();
        render(<ArchiveScreen onNavigate={onNavigate} />);

        await userEvent.type(search(), 'staircase');
        await userEvent.click(screen.getByText(/staircase/i));

        expect(onNavigate).toHaveBeenCalledWith('detail', dreams[2].id);
    });

    it('goes home from the back button', async () => {
        const onNavigate = vi.fn();
        render(<ArchiveScreen onNavigate={onNavigate} />);

        await userEvent.click(screen.getByRole('button', { name: /^back$/i }));
        expect(onNavigate).toHaveBeenCalledWith('home');
    });
});
