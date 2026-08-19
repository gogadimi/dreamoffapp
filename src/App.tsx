import { useState, useEffect } from 'react';
import { Home, PlusCircle, Book, User } from 'lucide-react';
import HomeScreen from './screens/HomeScreen';
import AddDreamScreen from './screens/AddDreamScreen';
import ArchiveScreen from './screens/ArchiveScreen';
import DreamDetailScreen from './screens/DreamDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import ModelsScreen from './screens/ModelsScreen';
import { useDreamStore } from './hooks/useDreamStore';
import { t } from './utils/translations';

function App() {
    // Get state from store (currentUser drives auth state)
    const { language, currentUser, authLoading, checkAuth } = useDreamStore();

    // Validate JWT on app mount — keeps user logged in across refresh
    useEffect(() => { checkAuth(); }, []);

    // Derived state for clarity
    const isLoggedIn = !!currentUser;

    const [navState, setNavState] = useState<{ screen: string; params?: any }>({ screen: 'home' });

    // params stays undefined when omitted — passing null here would defeat the
    // callee's default parameter (defaults fire on undefined, not on null).
    const navigate = (screen: string, params?: any) => {
        setNavState({ screen, params });
    };

    const renderScreen = () => {
        switch (navState.screen) {
            case 'home':
                return <HomeScreen onNavigate={navigate} />;
            case 'add':
                // Pass navState.params as initialMode ('record' or 'write')
                return <AddDreamScreen onNavigate={navigate} initialMode={navState.params ?? 'write'} />;
            case 'archive':
                return <ArchiveScreen onNavigate={navigate} />;
            case 'models':
                return <ModelsScreen onNavigate={navigate} />;
            case 'detail':
                return <DreamDetailScreen dreamId={navState.params} onBack={() => navigate('archive')} />;
            case 'profile':
                return <ProfileScreen onNavigate={navigate} />;
            default:
                return <HomeScreen onNavigate={navigate} />;
        }
    };

    const NavIcon = ({ icon: Icon, label, screen }) => (
        <button
            onClick={() => navigate(screen)}
            className={`flex flex-col items-center justify-center w-16 h-16 transition-colors ${navState.screen === screen ? 'text-primary' : 'text-gray-600'}`}
        >
            <Icon className={`w-6 h-6 ${navState.screen === screen ? 'drop-shadow-[0_0_8px_rgba(233,216,166,0.6)]' : ''}`} />
            <span className="text-[10px] mt-1 font-sans">{label}</span>
        </button>
    );

    // Show spinner while verifying stored JWT
    if (authLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm font-serif tracking-wide">Loading...</p>
                </div>
            </div>
        );
    }

    // AUTH GUARD
    if (!isLoggedIn) {
        return <LoginScreen />;
    }

    return (
        <div className="h-screen w-full flex justify-center bg-background text-primary font-sans overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface to-background transition-colors duration-500">

            {/* Phone container — full width on mobile, centered & framed on sm+ */}
            <div className="relative h-full w-full sm:max-w-md sm:border-x sm:border-border/10 flex flex-col overflow-hidden">

                {/* Main Content */}
                <main className={`flex-1 w-full relative ${navState.screen === 'home' ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto no-scrollbar pt-safe-top pb-24 px-4'}`}>
                    {renderScreen()}
                </main>

                {/* Bottom Nav */}
                {navState.screen !== 'detail' && (
                    <nav className="h-20 bg-surface/90 backdrop-blur-md border-t border-border/30 flex justify-around items-center z-50 rounded-t-2xl shadow-glow pb-safe-bottom absolute bottom-0 w-full left-0 animate-slide-up">
                        <NavIcon icon={Home} label={t(language, 'home')} screen="home" />
                        <NavIcon icon={PlusCircle} label={t(language, 'add')} screen="add" />
                        <NavIcon icon={Book} label={t(language, 'journal')} screen="archive" />
                        <NavIcon icon={User} label={t(language, 'profile')} screen="profile" />
                    </nav>
                )}

            </div>
        </div>
    );
}

export default App;
