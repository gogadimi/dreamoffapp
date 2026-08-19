import { Search, ArrowLeft, Moon } from 'lucide-react';
import Card from '../components/Card';
import { useDreamStore } from '../hooks/useDreamStore';

export default function ArchiveScreen({ onNavigate }) {
    const { dreams } = useDreamStore();

    return (
        <div className="space-y-5">

            {/* Back button — professional pill */}
            <button
                onClick={() => onNavigate('home')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-surface/60 backdrop-blur-sm border border-border/20 rounded-xl text-sm text-gray-400 hover:text-primary hover:border-border/40 hover:bg-surface/80 transition-all duration-200 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                <span className="font-medium">Back</span>
            </button>

            <h2 className="text-3xl font-serif text-center text-primary">Dream Archive</h2>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search dreams..."
                    className="w-full bg-surface border border-border/30 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-border/60 transition-colors"
                />
            </div>

            <div className="grid grid-cols-1 gap-3">
                {dreams.length === 0 && (
                    <div className="text-center text-gray-500 py-16 opacity-50 font-serif italic">
                        No dreams recorded yet.
                    </div>
                )}

                {dreams.map(dream => (
                    <Card
                        key={dream.id}
                        onClick={() => onNavigate('detail', dream.id)}
                        className="cursor-pointer hover:border-border/50 p-0"
                    >
                        {/* Horizontal layout inside Card's inner flex-col wrapper */}
                        <div className="flex items-center gap-4 p-4">
                            {dream.imageUrl ? (
                                <img
                                    src={dream.imageUrl}
                                    alt="Dream thumbnail"
                                    className="w-[60px] h-[60px] rounded-xl object-cover border border-border/30 flex-shrink-0"
                                />
                            ) : (
                                <div className="w-[60px] h-[60px] rounded-xl border border-border/30 bg-surfaceLight/30 flex items-center justify-center flex-shrink-0">
                                    <Moon className="w-6 h-6 text-gray-600" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <span className="text-[10px] text-accent/80 uppercase tracking-[0.15em] font-semibold">
                                    {new Date(dream.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <p className="font-serif text-base text-primary/90 line-clamp-2 leading-snug">
                                    {dream.text}
                                </p>
                                <span className="text-[10px] text-gray-500 bg-black/30 border border-border/15 px-2 py-0.5 rounded-md w-fit">
                                    {dream.model}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
