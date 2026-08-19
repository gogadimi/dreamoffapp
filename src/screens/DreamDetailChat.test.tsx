import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DreamDetailScreen from './DreamDetailScreen';
import { Dream } from '../types/index';

const sendChatMessage = vi.fn();
let dreams: Dream[] = [];

vi.mock('../hooks/useDreamStore', () => ({
    useDreamStore: () => ({
        language: 'en',
        getDream: (id: string) => dreams.find(d => d.id === id),
        sendChatMessage
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
        interpretation: { summary: 'A dream of freedom' },
        ...overrides
    };
}

const input = () => screen.getByLabelText(/ask a question/i);
const sendButton = () => screen.getByRole('button', { name: /^send$/i });

beforeEach(() => {
    sendChatMessage.mockReset();
    sendChatMessage.mockResolvedValue([]);
    dreams = [makeDream()];
});

describe('chat rendering', () => {
    it('greets the user with the framework it used', () => {
        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);
        expect(screen.getByText(/I have interpreted this dream using the jung framework/i)).toBeInTheDocument();
    });

    // Regression: the transcript lived in component state, so leaving the
    // screen threw it away. It now comes from the dream itself.
    it('renders a transcript that was persisted on the dream', () => {
        dreams = [makeDream({
            chatHistory: [
                { role: 'user', content: 'What does the ocean mean?' },
                { role: 'assistant', content: 'It stands for the unconscious.' }
            ]
        })];

        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);

        expect(screen.getByText('What does the ocean mean?')).toBeInTheDocument();
        expect(screen.getByText('It stands for the unconscious.')).toBeInTheDocument();
    });

    it('handles a dream with no transcript yet', () => {
        expect(() => render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />)).not.toThrow();
    });
});

describe('sending a message', () => {
    it('asks the server rather than fabricating a reply', async () => {
        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);

        await userEvent.type(input(), 'Why a red ocean?');
        await userEvent.click(sendButton());

        expect(sendChatMessage).toHaveBeenCalledWith('d1', 'Why a red ocean?');
    });

    it('sends on Enter too', async () => {
        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);

        await userEvent.type(input(), 'Why a red ocean?{Enter}');
        expect(sendChatMessage).toHaveBeenCalledWith('d1', 'Why a red ocean?');
    });

    it('trims the question', async () => {
        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);

        await userEvent.type(input(), '   spaced out   {Enter}');
        expect(sendChatMessage).toHaveBeenCalledWith('d1', 'spaced out');
    });

    it('refuses to send an empty or whitespace-only question', async () => {
        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);

        expect(sendButton()).toBeDisabled();

        await userEvent.type(input(), '    {Enter}');
        expect(sendChatMessage).not.toHaveBeenCalled();
    });

    it('clears the box after a successful send', async () => {
        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);

        await userEvent.type(input(), 'a question{Enter}');
        await waitFor(() => expect(input()).toHaveValue(''));
    });

    it('shows a thinking indicator while waiting', async () => {
        let resolve!: (value: unknown) => void;
        sendChatMessage.mockReturnValue(new Promise(r => { resolve = r; }));

        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);
        await userEvent.type(input(), 'a question{Enter}');

        expect(screen.getByText(/thinking/i)).toBeInTheDocument();

        resolve([]);
        await waitFor(() => expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument());
    });

    it('locks the input while a request is in flight', async () => {
        let resolve!: (value: unknown) => void;
        sendChatMessage.mockReturnValue(new Promise(r => { resolve = r; }));

        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);
        await userEvent.type(input(), 'a question{Enter}');

        expect(input()).toBeDisabled();

        resolve([]);
        await waitFor(() => expect(input()).not.toBeDisabled());
    });

    it('does not fire a second request while one is pending', async () => {
        sendChatMessage.mockReturnValue(new Promise(() => {}));

        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);
        await userEvent.type(input(), 'first{Enter}');
        await userEvent.type(input(), 'second{Enter}');

        expect(sendChatMessage).toHaveBeenCalledTimes(1);
    });
});

describe('when the request fails', () => {
    it('shows the error instead of failing silently', async () => {
        sendChatMessage.mockRejectedValue(new Error('Failed to reach the AI. Please try again.'));

        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);
        await userEvent.type(input(), 'a question{Enter}');

        expect(await screen.findByRole('alert')).toHaveTextContent(/failed to reach the ai/i);
    });

    it('gives the question back rather than losing it', async () => {
        sendChatMessage.mockRejectedValue(new Error('network'));

        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);
        await userEvent.type(input(), 'my careful question{Enter}');

        await waitFor(() => expect(input()).toHaveValue('my careful question'));
    });

    it('re-enables the input so the user can retry', async () => {
        sendChatMessage.mockRejectedValue(new Error('network'));

        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);
        await userEvent.type(input(), 'a question{Enter}');

        await waitFor(() => expect(input()).not.toBeDisabled());
    });

    it('clears the error on the next attempt', async () => {
        sendChatMessage.mockRejectedValueOnce(new Error('network'));

        render(<DreamDetailScreen dreamId="d1" onBack={vi.fn()} />);
        await userEvent.type(input(), 'a question{Enter}');
        expect(await screen.findByRole('alert')).toBeInTheDocument();

        sendChatMessage.mockResolvedValue([]);
        await userEvent.click(sendButton());

        await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    });
});
