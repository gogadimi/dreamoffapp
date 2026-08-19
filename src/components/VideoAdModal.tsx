import { useState, useEffect } from 'react';
import { Play, SkipForward, Info, Volume2 } from 'lucide-react';

export default function VideoAdModal({ onComplete }: { onComplete: () => void }) {
    const [secondsLeft, setSecondsLeft] = useState(5);
    const [canSkip, setCanSkip] = useState(false);

    useEffect(() => {
        if (secondsLeft > 0) {
            const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanSkip(true);
        }
    }, [secondsLeft]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-fade-in">
            {/* Top Indicator */}
            <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <Info className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Advertisement</span>
            </div>

            {/* Video Placeholder Area */}
            <div className="w-full h-full max-w-4xl aspect-video bg-[#0d1117] relative flex items-center justify-center group cursor-pointer">
                {/* Simulated Video Content */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f26] to-[#0d1117] flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-24 h-24 mb-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse">
                        <Play className="w-12 h-12 text-amber-500 fill-amber-500/20" />
                    </div>
                    <h2 className="text-3xl font-serif text-[#f0e6d2] mb-3">DreamOff Premium</h2>
                    <p className="text-gray-400 max-w-md italic">Unlock deeper insights and infinite AI generations. Our most advanced models are waiting for you.</p>
                </div>

                {/* Progress Bar (Simulated) */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
                    <div
                        className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${((5 - secondsLeft) / 5) * 100}%` }}
                    ></div>
                </div>

                {/* Volume Icon */}
                <div className="absolute bottom-6 left-6 text-white/40">
                    <Volume2 className="w-5 h-5" />
                </div>
            </div>

            {/* Skip Button / Counter */}
            <div className="absolute bottom-10 right-10">
                {!canSkip ? (
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-xl text-white font-bold flex items-center gap-3">
                        <span className="text-amber-500 text-lg tabular-nums">{secondsLeft}</span>
                        <span className="text-sm uppercase tracking-widest opacity-80">Skip Ad in...</span>
                    </div>
                ) : (
                    <button
                        onClick={onComplete}
                        className="bg-white text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-100 transition-all active:scale-95 shadow-2xl animate-bounce-in"
                    >
                        Skip Ad <SkipForward className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Branding Footer */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-500 text-[10px] uppercase tracking-[0.3em] font-medium opacity-50">
                Powered by Google AdSense
            </div>
        </div>
    );
}
