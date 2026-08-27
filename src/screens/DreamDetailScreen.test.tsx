import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DreamDetailScreen from './DreamDetailScreen';
import { Dream } from '../types/index';

const dreams: Dream[] = [];

vi.mock('../hooks/useDreamStore', () => ({
    useDreamStore: () => ({
        language: 'en',
        getDream: (id: string) => dreams.find(d => d.id === id)
    })
}));

function makeDream(overrides: Partial<Dream> = {}): Dream {
    return {
        id: 'd1',
        date: '2026-08-19T00:00:00.000Z',
        title: '',
        content: '',
        lucid: false,
        themes: [],
        mood: '',
        chatHistory: [],
        text: 'I was flying over a red ocean',
        model: 'jung',
        ...overrides
    };
}

beforeEach(() => {
    dreams.length = 0;
});

describe('DreamDetailScreen', () => {
    // Regression: a dream whose interpretation never persisted fell into the
    // object branch and dereferenced undefined, blanking the page on reload.
    it('does not crash when the interpretation is missing', () => {
        dreams.push(makeDream({ interpretation: undefined }));
        expect(() =>
            render(<DreamDetailScreen dreamId="d1" onBack={() => {}} />)
        ).not.toThrow();
        expect(screen.getByText(/no interpretation is available/i)).toBeInTheDocument();
    });

    it('renders a structured interpretation', () => {
        dreams.push(makeDream({
            interpretation: {
                summary: 'A dream of freedom',
                archetypes: 'The Hero departs',
                symbols: [{ element: 'ocean', meaning: 'the unconscious' }]
            }
        }));
        render(<DreamDetailScreen dreamId="d1" onBack={() => {}} />);
        expect(screen.getByText(/A dream of freedom/)).toBeInTheDocument();
        expect(screen.getByText('The Hero departs')).toBeInTheDocument();
        expect(screen.getByText('ocean')).toBeInTheDocument();
        expect(screen.getByText('the unconscious')).toBeInTheDocument();
    });

    it('still renders a legacy string interpretation', () => {
        dreams.push(makeDream({ interpretation: 'An older, plain-text reading.' }));
        render(<DreamDetailScreen dreamId="d1" onBack={() => {}} />);
        expect(screen.getByText('An older, plain-text reading.')).toBeInTheDocument();
    });

    it('omits the image entirely when there is none', () => {
        dreams.push(makeDream({ imageUrl: undefined }));
        render(<DreamDetailScreen dreamId="d1" onBack={() => {}} />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders the image when one exists', () => {
        dreams.push(makeDream({ imageUrl: '/uploads/abc.png' }));
        render(<DreamDetailScreen dreamId="d1" onBack={() => {}} />);
        expect(screen.getByRole('img')).toHaveAttribute('src', '/uploads/abc.png');
    });

    // Regression: transcription used to render the literal string "undefined".
    it('falls back to the raw text when there is no transcription', () => {
        dreams.push(makeDream({ transcription: undefined, text: 'raw dream text' }));
        render(<DreamDetailScreen dreamId="d1" onBack={() => {}} />);
        expect(screen.getByText(/raw dream text/)).toBeInTheDocument();
        expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    });

    it('does not name a framework it does not have', () => {
        dreams.push(makeDream({ model: undefined }));
        render(<DreamDetailScreen dreamId="d1" onBack={() => {}} />);
        expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
        expect(screen.getByText('Analysis')).toBeInTheDocument();
    });

    it('reports a missing dream instead of throwing', () => {
        render(<DreamDetailScreen dreamId="nope" onBack={() => {}} />);
        expect(screen.getByText(/dream not found/i)).toBeInTheDocument();
    });
});
