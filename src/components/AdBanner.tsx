import { ExternalLink } from 'lucide-react';

export default function AdBanner() {
    return (
        <div className="w-full mb-3 animate-fade-in">
            <div className="relative group overflow-hidden rounded-[16px] bg-[#161b22]/40 border border-amber-900/20 backdrop-blur-xl">
                {/* Visual Placeholder Content */}
                <div className="px-4 py-3 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-900/10 rounded-xl flex items-center justify-center border border-amber-900/20">
                            <span className="text-[10px] font-bold text-amber-500/50 uppercase tracking-tighter">AD</span>
                        </div>
                        <div>
                            <h3 className="text-amber-100/90 font-serif text-sm sm:text-base">Support DreamOff</h3>
                            <p className="text-gray-500 text-[10px] sm:text-xs">Your contribution helps us uncover more mysteries.</p>
                        </div>
                    </div>

                    <button className="flex items-center gap-2 bg-amber-100/5 hover:bg-amber-100/10 text-amber-100/80 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-amber-100/10">
                        Learn More <ExternalLink className="w-3 h-3" />
                    </button>
                </div>

                {/* Developer Instructions Overlay (only visible in dev or easily found) */}
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none sm:pointer-events-auto">
                    <div className="text-center p-4">
                        <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1">Google Ads Placeholder</p>
                        <p className="text-gray-400 text-[9px] max-w-[200px] mx-auto">Replace this component with your Google AdSense tag or script here.</p>
                    </div>
                </div>

                {/* Artistic background lines */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-900/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
            </div>
        </div>
    );
}
