import { useState } from 'react';
import { Globe, Moon, X, Check, ArrowLeft, ArrowRight, LogOut } from 'lucide-react';
import Card from '../components/Card';
import { useDreamStore } from '../hooks/useDreamStore';
import { LANGUAGES, t } from '../utils/translations';
import { NavigateFn } from '../types/index';

export default function ProfileScreen({ onNavigate }: { onNavigate: NavigateFn }) {
    const { language, setLanguage, currentUser, logoutUser } = useDreamStore();
    const [showLangPicker, setShowLangPicker] = useState(false);

    // Custom Language Picker Modal
    const LanguagePicker = () => (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-surface/90 border border-gold/30 rounded-3xl p-6 shadow-glow relative max-h-[80vh] overflow-y-auto">
                <button
                    onClick={() => setShowLangPicker(false)}
                    className="absolute top-4 right-4 p-2 bg-surfaceLight rounded-full text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-2xl font-serif text-center mb-8 text-gold drop-shadow-md">
                    {t(language, 'language')}
                </h3>

                <div className="space-y-3">
                    {LANGUAGES.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setLanguage(lang.code);
                                setShowLangPicker(false);
                            }}
                            className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all duration-300 group ${language === lang.code
                                ? 'bg-gold/10 border-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                                : 'bg-surfaceLight/20 border-border/20 hover:bg-surfaceLight/40 hover:border-gold/30'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Simple visual indicator */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${language === lang.code ? 'bg-gold text-black' : 'bg-surfaceLight text-gray-500'}`}>
                                    <span className="text-xs font-bold uppercase">{lang.code.substring(0, 2)}</span>
                                </div>
                                <span className={`font-serif text-lg ${language === lang.code ? 'text-gold' : 'text-gray-300 group-hover:text-gray-100'}`}>
                                    {lang.label}
                                </span>
                            </div>
                            {language === lang.code && <Check className="w-5 h-5 text-gold" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4 space-y-6 pb-24 animate-fade-in z-10 w-full max-w-md mx-auto">

            {/* Back button — professional pill */}
            <button
                onClick={() => onNavigate && onNavigate('home')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-surface/60 backdrop-blur-sm border border-border/20 rounded-xl text-sm text-gray-400 hover:text-primary hover:border-border/40 hover:bg-surface/80 transition-all duration-200 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                <span className="font-medium">Back</span>
            </button>

            {showLangPicker && <LanguagePicker />}

            {/* Header */}
            <div className="flex items-center space-x-4 mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-gold/20 to-purple-900/20 border-2 border-gold flex items-center justify-center shadow-glow">
                    <span className="font-serif text-4xl text-gold pt-1">
                        {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                    </span>
                </div>
                <div>
                    <h2 className="text-3xl font-serif text-primary">
                        {currentUser?.name || 'Dreamer'}
                    </h2>
                    <p className="text-xs text-gold/70 uppercase tracking-widest font-bold">
                        {t(language, 'profile')}
                    </p>
                </div>
            </div>

            <div className="h-px w-full bg-border/30 mb-8" />

            {/* Settings Group */}
            <div className="space-y-4">
                <h3 className="text-gray-500 text-xs uppercase tracking-[0.2em] font-bold ml-2 mb-4">
                    {t(language, 'settings')}
                </h3>

                {/* Language Selector Trigger */}
                <Card
                    onClick={() => setShowLangPicker(true)}
                    className="flex items-center justify-between p-5 cursor-pointer hover:border-gold/50 transition-colors group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-center gap-4 relative z-10 w-full">
                        <div className="p-3 bg-surfaceLight/50 rounded-xl text-gold group-hover:scale-110 transition-transform shadow-inner">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col text-left flex-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{t(language, 'language')}</span>
                            <span className="text-xl text-gray-100 font-serif">
                                {LANGUAGES.find(l => l.code === language)?.label || 'Select'}
                            </span>
                        </div>
                        {/* Only ArrowRight now, no extra gear */}
                        <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-gold transition-colors" />
                    </div>
                </Card>

                {/* Theme (Mock) */}
                <Card className="flex items-center justify-between p-5 opacity-70">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-surfaceLight/50 rounded-xl text-gray-500">
                            <Moon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{t(language, 'theme')}</span>
                            <span className="text-xl text-gray-500 font-serif">Baroque AI</span>
                        </div>
                    </div>
                </Card>

                {/* Logout */}
                <Card
                    onClick={logoutUser}
                    className="flex items-center justify-between p-5 cursor-pointer hover:border-red-900/50 transition-colors group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-red-900/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10 w-full">
                        <div className="p-3 bg-red-900/20 rounded-xl text-red-400 group-hover:scale-110 transition-transform shadow-inner">
                            <LogOut className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col text-left flex-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Account</span>
                            <span className="text-xl text-red-400 font-serif">Log Out</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Info */}
            <div className="text-center pt-12 space-y-3 opacity-60">
                <p className="text-[10px] text-gold/50 uppercase tracking-[0.3em]">Version 1.0.0</p>
            </div>

        </div>
    );
}
