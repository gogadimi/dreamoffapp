import { useState, useRef } from 'react';
import { NavigateFn } from '../types/index';
import { Mic, Send, Loader2, ArrowLeft, ChevronDown, Check } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { interpretDream } from '../services/interpretationAgent';
import { generateDreamImage } from '../services/imageAgent';
import { useDreamStore } from '../hooks/useDreamStore';
import VideoAdModal from '../components/VideoAdModal';

const MODELS = [
    { id: 'jung', name: 'Jungian Archetypes' },
    { id: 'freud', name: 'Freudian Psychoanalysis' },
    { id: 'cbt', name: 'Modern Cognitive (CBT)' },
    { id: 'balkan', name: 'Traditional Balkan' },
    { id: 'spiritual', name: 'Spiritual / New Age' }
];

// The Web Speech API is prefixed and untyped in lib.dom, so the shape this
// component actually uses is spelled out here rather than cast away at usage.
interface SpeechRecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEventLike) => void;
    start(): void;
    stop(): void;
}

interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

export default function AddDreamScreen({ onNavigate, initialMode = 'write' }: { onNavigate: NavigateFn; initialMode?: string }) {
    // initialMode passed from App.jsx: 'record' or 'write'
    const [text, setText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [selectedModel, setSelectedModel] = useState('jung');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showAd, setShowAd] = useState(false);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false); // State for custom dropdown

    const { addDream, language } = useDreamStore();
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            if (!('webkitSpeechRecognition' in window)) {
                alert("Speech recognition not supported in this browser.");
                return;
            }
            const recognition: SpeechRecognitionLike = new (window as any).webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language === 'mk' ? 'mk-MK' : 'en-US';

            recognition.onresult = (event: SpeechRecognitionEventLike) => {
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) final += event.results[i][0].transcript;
                }
                if (final) setText(prev => prev + ' ' + final);
            };

            recognition.start();
            recognitionRef.current = recognition;
            setIsRecording(true);
        }
    };

    const getDeviceType = () => {
        const width = window.innerWidth;
        if (width < 640) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    };

    const handleInterpret = async () => {
        if (!text.trim()) return;
        setShowAd(false); // Close ad
        setIsProcessing(true); // Start processing

        const deviceType = getDeviceType();

        try {
            const [interpResult, imageUrl] = await Promise.all([
                interpretDream(text, selectedModel, deviceType, language),
                generateDreamImage(text)
            ]);

            const newDream = await addDream({
                text,
                model: selectedModel,
                layout: deviceType,
                language: language,
                transcription: interpResult.transcription,
                interpretation: interpResult.interpretation,
                imageUrl
            });

            onNavigate('detail', newDream.id);
        } catch (e) {
            console.error(e);
            alert("Failed to process dream.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (showAd) {
        return <VideoAdModal onComplete={handleInterpret} />;
    }

    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-serif animate-pulse">Consulting the Oracle...</h2>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6 px-4 pt-4 min-h-full">
            {/* Back button — professional pill */}
            <button
                onClick={() => onNavigate('home')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-surface/60 backdrop-blur-sm border border-border/20 rounded-xl text-sm text-gray-400 hover:text-primary hover:border-border/40 hover:bg-surface/80 transition-all duration-200 group self-start"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                <span className="font-medium">Back</span>
            </button>

            <h2 className="text-3xl font-serif text-center text-primary">
                {initialMode === 'record' ? (language === 'mk' ? 'Сними Сон' : 'Record Dream') : (language === 'mk' ? 'Запиши Сон' : 'Write Dream')}
            </h2>

            {/* CONDITIONAL UI */}

            {/* RECORD MODE: Show Mic, Hide Textarea initially */}
            {initialMode === 'record' && (
                <div className="flex flex-col items-center justify-center flex-1 space-y-8 animate-fade-in">
                    <button
                        onClick={toggleRecording}
                        className={`w-40 h-40 sm:w-52 sm:h-52 rounded-full flex items-center justify-center border-4 border-border shadow-glow transition-all mb-4 ${isRecording ? 'bg-accent animate-pulse scale-110' : 'bg-surface hover:scale-105'}`}
                    >
                        <Mic className={`w-16 h-16 sm:w-20 sm:h-20 ${isRecording ? 'text-white' : 'text-primary'}`} />
                    </button>
                    <p className="text-gray-400 font-serif italic text-lg opacity-80">
                        {isRecording
                            ? (language === 'mk' ? 'Слушам...' : 'Listening...')
                            : (language === 'mk' ? 'Допрете за да зборувате' : 'Tap to speak')}
                    </p>

                    {/* Show preview only if text exists */}
                    {text && (
                        <div className="w-full bg-surface/50 p-4 rounded-xl border border-border/30 max-h-40 overflow-y-auto animate-slide-up">
                            <p className="text-gray-300 italic">&ldquo;{text}&rdquo;</p>
                        </div>
                    )}
                </div>
            )}

            {/* WRITE MODE: Show Textarea, Hide Mic */}
            {initialMode === 'write' && (
                <div className="flex-1 min-h-[300px] flex flex-col">
                    <Card className="flex-1 flex flex-col animate-fade-in">
                        <textarea
                            className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-lg placeholder-gray-600 font-serif p-2 min-h-full"
                            placeholder={language === 'mk' ? "Опишете го вашиот сон..." : "Describe your dream here..."}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            autoFocus
                        />
                    </Card>
                </div>
            )}

            {/* Models Selector - CUSTOM DROPDOWN */}
            <div className="space-y-2 relative z-40">
                <label className="text-xs text-gray-500 uppercase tracking-widest pl-1 font-bold">
                    {language === 'mk' ? 'Модел на Толкување' : 'Interpretation Model'}
                </label>

                {/* Custom Trigger Button */}
                <button
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className={`w-full bg-surface border ${isModelDropdownOpen ? 'border-gold' : 'border-border/50'} rounded-lg p-3 text-primary flex items-center justify-between hover:bg-surfaceLight/10 transition-all duration-300 shadow-sm`}
                >
                    <span className="font-serif text-lg">
                        {MODELS.find(m => m.id === selectedModel)?.name}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isModelDropdownOpen ? 'rotate-180 text-gold' : ''}`} />
                </button>

                {/* Dropdown Options List */}
                {isModelDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-surface/95 backdrop-blur-xl border border-gold/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-slide-up z-50">
                        {MODELS.map(m => (
                            <button
                                key={m.id}
                                onClick={() => {
                                    setSelectedModel(m.id);
                                    setIsModelDropdownOpen(false);
                                }}
                                className={`w-full p-4 flex items-center justify-between text-left transition-colors font-serif ${selectedModel === m.id
                                    ? 'bg-gold/20 text-gold'
                                    : 'text-gray-300 hover:bg-surfaceLight hover:text-gray-100'
                                    }`}
                            >
                                <span>{m.name}</span>
                                {selectedModel === m.id && <Check className="w-4 h-4 text-gold" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Submit Button - Available in Both Modes */}
            <Button onClick={() => setShowAd(true)} disabled={!text} variant="action" className="w-full py-4 text-lg shadow-lg">
                {language === 'mk' ? 'Толкувај' : 'Interpret Dream'} <Send className="w-5 h-5 ml-2" />
            </Button>
        </div>
    );
}
