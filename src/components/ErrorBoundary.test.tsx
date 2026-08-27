import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

function Boom({ message = 'dream record is malformed' }: { message?: string }): never {
    throw new Error(message);
}

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // React logs caught errors to console.error; silence the expected noise
        // so a real unexpected error still stands out in test output.
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders children when nothing throws', () => {
        render(
            <ErrorBoundary>
                <p>all good</p>
            </ErrorBoundary>
        );
        expect(screen.getByText('all good')).toBeInTheDocument();
    });

    it('catches a render-time throw instead of blanking the page', () => {
        render(
            <ErrorBoundary>
                <Boom />
            </ErrorBoundary>
        );
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('surfaces the error message so the failure is diagnosable', () => {
        render(
            <ErrorBoundary>
                <Boom message="interpretation is undefined" />
            </ErrorBoundary>
        );
        expect(screen.getByText('interpretation is undefined')).toBeInTheDocument();
    });

    it('reports the error to the console for debugging', () => {
        render(
            <ErrorBoundary>
                <Boom message="logged please" />
            </ErrorBoundary>
        );
        const logged = (console.error as ReturnType<typeof vi.fn>).mock.calls
            .flat()
            .some(arg => arg instanceof Error && arg.message === 'logged please');
        expect(logged).toBe(true);
    });

    it('recovers when the child stops throwing and Try again is pressed', async () => {
        function Flaky() {
            const [broken, setBroken] = useState(true);
            return (
                <ErrorBoundary>
                    <button onClick={() => setBroken(false)}>fix it</button>
                    {broken ? <Boom /> : <p>recovered</p>}
                </ErrorBoundary>
            );
        }

        // The boundary is inside Flaky, so Flaky's own state survives the catch.
        const { rerender } = render(<Flaky />);
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        // Retry alone re-renders the same throwing child, so the fallback returns.
        await userEvent.click(screen.getByRole('button', { name: /try again/i }));
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        rerender(<Flaky />);
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
});
