import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

/**
 * Catches render-time errors so a single bad dream record cannot blank the
 * whole app. Error boundaries must be class components — there is no hook
 * equivalent for componentDidCatch.
 */
export default class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[DreamOff] Render error:', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ error: null });
    };

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4 font-sans">
                <div className="w-full max-w-md bg-surface/60 border border-border/30 rounded-3xl p-8 text-center backdrop-blur-xl">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-900/15 border border-red-900/30 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>

                    <h1 className="text-2xl font-serif text-primary mb-3">Something went wrong</h1>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        The app hit an unexpected error while rendering. Your dreams are safe —
                        they are stored on the server.
                    </p>

                    <pre className="text-left text-[11px] text-gray-600 bg-black/30 border border-border/20 rounded-xl p-3 mb-6 overflow-x-auto whitespace-pre-wrap break-words">
                        {error.message}
                    </pre>

                    <button
                        onClick={this.handleReset}
                        className="w-full bg-surfaceLight/60 hover:bg-surfaceLight border border-border/40 hover:border-border rounded-2xl py-3 px-5 text-primary font-medium transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        <RotateCcw className="w-4 h-4" /> Try again
                    </button>
                </div>
            </div>
        );
    }
}
