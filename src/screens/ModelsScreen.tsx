import { ArrowLeft, Brain } from 'lucide-react';
import Card from '../components/Card';
import { useDreamStore } from '../hooks/useDreamStore';
import { t } from '../utils/translations';
import { NavigateFn } from '../types/index';

const MODELS_INFO = [
    {
        id: 'jung',
        name: 'Jungian Archetypes',
        desc_en: "Focuses on universal symbols (archetypes) and the collective unconscious. Good for spiritual growth.",
        desc_mk: "Се фокусира на универзални симболи (архетипи) и колективното несвесно. Добро за духовен раст."
    },
    {
        id: 'freud',
        name: 'Freudian Psychoanalysis',
        desc_en: "Analyzes repressed desires and childhood memories. Often relates dreams to hidden conflicts.",
        desc_mk: "Ги анализира потиснатите желби и спомени од детството. Често ги поврзува соништата со скриени конфликти."
    },
    {
        id: 'cbt',
        name: 'Modern Cognitive (CBT)',
        desc_en: "Views dreams as memory processing and emotion regulation. Practical and grounded.",
        desc_mk: "Ги гледа соништата како процесирање на меморија и регулација на емоции. Практично и приземјено."
    },
    {
        id: 'balkan',
        name: 'Traditional Balkan',
        desc_en: "Folk interpretations based on local myths and superstitions. Predicts future events.",
        desc_mk: "Народни толкувања базирани на локални митови и суеверија. Предвидува идни настани."
    },
    {
        id: 'spiritual',
        name: 'Spiritual / New Age',
        desc_en: "Interprets dreams as messages from the universe or higher self. Intuitive and mystical.",
        desc_mk: "Ги толкува соништата како пораки од универзумот или вишото јас. Интуитивно и мистично."
    }
];

export default function ModelsScreen({ onNavigate }: { onNavigate: NavigateFn }) {
    const { language } = useDreamStore();

    return (
        <div className="flex flex-col space-y-6 pb-20 relative px-4 pt-4">
            {/* Professional Back Arrow */}
            <div className="absolute top-2 left-2 z-50">
                <button
                    onClick={() => onNavigate('home')}
                    className="p-3 bg-surface/30 backdrop-blur-md border border-border/30 rounded-full text-gray-400 hover:text-gold hover:border-gold hover:bg-surface/50 transition-all duration-300 shadow-lg group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
            </div>

            <div className="text-center pt-8 mb-4">
                <h2 className="text-3xl font-serif text-primary mb-2">{t(language, 'models')}</h2>
                <p className="text-gray-500 text-sm italic">Explore the frameworks used to interpret your dreams</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {MODELS_INFO.map(model => (
                    <Card key={model.id} className="p-5 border-l-4 border-l-gold/50 hover:border-l-gold transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-surfaceLight/30 rounded-xl text-gold">
                                <Brain className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-serif text-primary font-bold">{model.name}</h3>
                                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                                    {language === 'mk' ? model.desc_mk : model.desc_en}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
