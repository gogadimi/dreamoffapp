import { Mic, PenTool, BookOpen, Brain } from 'lucide-react';
import Card from '../components/Card';
import { useDreamStore } from '../hooks/useDreamStore';
import { t } from '../utils/translations';
import AdBanner from '../components/AdBanner';
import { NavigateFn } from '../types/index';

export default function HomeScreen({ onNavigate }: { onNavigate: NavigateFn }) {
    const { language, currentUser } = useDreamStore();

    const menuItems = [
        {
            id: 'record',
            label: t(language, 'record'),
            icon: Mic,
            action: () => onNavigate('add', 'record') // Pass 'record' mode
        },
        {
            id: 'write',
            label: t(language, 'write'),
            icon: PenTool,
            action: () => onNavigate('add', 'write') // Pass 'write' mode
        },
        {
            id: 'archive',
            label: t(language, 'archive'),
            icon: BookOpen,
            action: () => onNavigate('archive')
        },
        {
            id: 'models',
            label: t(language, 'models'),
            icon: Brain,
            action: () => onNavigate('models') // Navigate to new Models screen
        }
    ];

    return (
        <div className="flex flex-col h-full w-full px-3 overflow-hidden">

            {/* 1. Header */}
            <div className="text-center pt-4 pb-2 flex-none animate-fade-in-down space-y-1">
                <p className="font-serif text-gold/80 text-xs tracking-widest uppercase">
                    {t(language, 'welcome') || 'WELCOME'}, {currentUser?.name ? currentUser.name.toUpperCase() : 'DREAMER'}
                </p>
                <h1 className="text-4xl font-serif text-primary drop-shadow-[0_0_10px_rgba(212,175,55,0.3)] tracking-wide">
                    {t(language, 'appTitle')}
                </h1>
                <p className="font-serif italic text-gray-500 text-xs max-w-[90%] mx-auto leading-tight">
                    {t(language, 'dailyQuote')}
                </p>
            </div>

            {/* 2. Ad Placeholder */}
            <AdBanner />

            {/* 3. Grid — flex-1 fills remaining space, grid auto-sizes its cells */}
            <div className="flex-1 min-h-0 pb-20">
                <div className="grid grid-cols-2 gap-3 h-full">
                    {menuItems.map((item) => (
                        <Card
                            key={item.id}
                            onClick={item.action}
                            className="cursor-pointer group border-border/20 hover:border-border hover:shadow-glow transition-all duration-300 active:scale-95 p-0"
                        >
                            {/* Inner wrapper centers content inside Card's h-full flex-col */}
                            <div className="flex flex-col items-center justify-center flex-1 gap-3 p-3">
                                <div className="p-3 sm:p-4 rounded-full bg-surfaceLight/40 border border-border/10 group-hover:bg-surfaceLight group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                                    <item.icon strokeWidth={1.5} className="w-7 h-7 text-primary group-hover:text-border" />
                                </div>
                                <span className="font-serif text-sm text-gray-300 group-hover:text-border transition-colors leading-tight text-center">
                                    {item.label}
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
