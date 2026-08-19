import { useState } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useDreamStore } from '../hooks/useDreamStore';
import Card from '../components/Card';

export default function DreamDetailScreen({ dreamId, onBack }: { dreamId: string; onBack: () => void }) {
    const { getDream, language: appLanguage } = useDreamStore();
    const dream = getDream(dreamId);

    // Determine language: Prefer dream's specific language, fallback to app language
    const lang = dream?.language || appLanguage;

    const [chatInput, setChatInput] = useState('');

    // Localized Initial Message
    const initialMsg = lang === 'mk'
        ? `Го толкував овој сон${dream?.model ? ` користејќи ја рамката ${dream.model}` : ''}. Имате ли конкретни прашања?`
        : `I have interpreted this dream${dream?.model ? ` using the ${dream.model} framework` : ''}. Do you have specific questions?`;

    const [messages, setMessages] = useState([
        { role: 'ai', text: initialMsg }
    ]);

    if (!dream) return <div>Dream not found</div>;

    const handleChat = () => {
        if (!chatInput.trim()) return;
        const userMsg = { role: 'user', text: chatInput };
        setMessages(prev => [...prev, userMsg]);
        setChatInput('');

        // Simulate AI Reply
        setTimeout(() => {
            const reply = lang === 'mk'
                ? "Тоа е интересно забележување. Симболот сугерира подлабок слој на значење во врска со вашето внатрешно јас."
                : "That is an interesting observation. The symbol suggests a deeper layer of meaning regarding your inner self.";

            setMessages(prev => [...prev, { role: 'ai', text: reply }]);
        }, 1000);
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <button onClick={onBack} className="flex items-center text-gray-400 mb-4 hover:text-primary">
                <ArrowLeft className="w-5 h-5 mr-1" /> Back
            </button>

            {/* Image — omitted entirely when generation failed or was skipped */}
            {dream.imageUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-border shadow-glow mb-6 group">
                    <img src={dream.imageUrl} alt="Dream Visualization" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                        <h2 className="text-white font-serif text-xl opacity-90">Visual Manifestation</h2>
                    </div>
                </div>
            )}

            {/* Interpretation Section */}
            <div className="space-y-6">
                <section>
                    <h3 className="text-accent text-sm uppercase tracking-widest mb-2 font-bold">Analysis{dream.model ? ` (${dream.model})` : ''}</h3>

                    {/* Render Logic: Check if it's a legacy string or a modern Object */}
                    {typeof dream.interpretation === 'string' ? (
                        <Card className="prose prose-invert max-w-none">
                            <p className="text-lg leading-relaxed text-gray-300">{dream.interpretation}</p>
                        </Card>
                    ) : dream.interpretation ? (
                        <div className="space-y-4">
                            {/* Summary */}
                            <Card className="text-lg text-primary/90 italic border-l-4 border-gold bg-surfaceLight/30">
                                "{dream.interpretation.summary || dream.interpretation.overview}"
                            </Card>

                            {/* Lenses */}
                            <div className="grid grid-cols-1 gap-4">
                                {dream.interpretation.archetypes && (
                                    <div className="bg-surface/50 p-4 rounded-xl border border-border/20">
                                        <h4 className="text-gold font-serif mb-2 font-bold">Archetypal Lens</h4>
                                        <p className="text-sm text-gray-300 leading-relaxed">{dream.interpretation.archetypes}</p>
                                    </div>
                                )}
                                {dream.interpretation.scientific && (
                                    <div className="bg-surface/50 p-4 rounded-xl border border-border/20">
                                        <h4 className="text-gold font-serif mb-2 font-bold">Scientific Lens (APA)</h4>
                                        <p className="text-sm text-gray-300 leading-relaxed">{dream.interpretation.scientific}</p>
                                    </div>
                                )}
                            </div>

                            {/* Tablet/Desktop: Symbols Table */}
                            {dream.interpretation.symbols && (
                                <div className="overflow-x-auto bg-surface/50 rounded-xl border border-border/20">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-surfaceLight text-gold">
                                            <tr>
                                                <th className="p-3">Element</th>
                                                <th className="p-3">Meaning</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10 text-gray-300">
                                            {dream.interpretation.symbols.map((row, i) => (
                                                <tr key={i}>
                                                    <td className="p-3 font-bold">{row.element}</td>
                                                    <td className="p-3 italic">{row.meaning}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Reflections */}
                            {(dream.interpretation.reflections || dream.interpretation.actions) && (
                                <div className="bg-surfaceLight/30 p-4 rounded-xl border border-dashed border-border/30">
                                    <h3 className="text-gray-500 text-xs uppercase mb-2">Guidance</h3>
                                    <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                                        {(dream.interpretation.reflections || dream.interpretation.actions).map((r, i) => (
                                            <li key={i}>{r}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Card className="text-center text-gray-500 italic py-8">
                            {lang === 'mk'
                                ? 'Толкувањето не е достапно за овој сон.'
                                : 'No interpretation is available for this dream.'}
                        </Card>
                    )}
                </section>

                {(dream.transcription || dream.text) && (
                    <section>
                        <h3 className="text-accent text-sm uppercase tracking-widest mb-2 font-bold">Transcription</h3>
                        <div className="bg-surfaceLight/50 p-4 rounded-lg italic text-gray-400 border-l-2 border-border">
                            "{dream.transcription || dream.text}"
                        </div>
                    </section>
                )}

                {/* Chat */}
                <section className="pt-4 border-t border-border/20">
                    <h3 className="text-accent text-sm uppercase tracking-widest mb-4 font-bold flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" /> Oracle Chat
                    </h3>

                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-border text-black' : 'bg-surfaceLight text-gray-300'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-surface border border-border/30 rounded-lg px-3 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-border/60"
                            placeholder={lang === 'mk' ? "Постави прашање..." : "Ask a question..."}
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleChat()}
                        />
                        <button onClick={handleChat} className="p-3 bg-border rounded-lg text-black hover:bg-accent transition-colors">
                            <ArrowLeft className="w-5 h-5 rotate-180" />
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
