import { useEffect, ComponentType } from 'react';
import {
    BrowserRouter, Routes, Route, Navigate, Outlet,
    useLocation, useNavigate, useParams
} from 'react-router-dom';
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
import { ScreenName, NavigateFn } from './types/index';
import { paths, pathFor, activeScreen } from './routes';

/**
 * Adapts the onNavigate(screen, params) contract the screens use onto the
 * router. Screens stay unaware of paths, and each navigation becomes a real
 * history entry, so browser Back works and a reload stays put.
 */
function useScreenNavigate(): NavigateFn {
    const navigate = useNavigate();
    return (screen, params) => navigate(pathFor(screen, params));
}

function LoadingScreen() {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                <p className="text-gray-500 text-sm font-serif tracking-wide">Loading...</p>
            </div>
        </div>
    );
}

function NavIcon({ icon: Icon, label, screen, active, onSelect }: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    screen: ScreenName;
    active: boolean;
    onSelect: (screen: ScreenName) => void;
}) {
    return (
        <button
            onClick={() => onSelect(screen)}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center w-16 h-16 transition-colors ${active ? 'text-primary' : 'text-gray-600'}`}
        >
            <Icon className={`w-6 h-6 ${active ? 'drop-shadow-[0_0_8px_rgba(233,216,166,0.6)]' : ''}`} />
            <span className="text-[10px] mt-1 font-sans">{label}</span>
        </button>
    );
}

/** The phone shell: signed-in chrome around whichever screen is routed. */
function AppShell() {
    const { language } = useDreamStore();
    const { pathname } = useLocation();
    const navigate = useScreenNavigate();

    const current = activeScreen(pathname);
    const isHome = current === 'home';
    const isDetail = current === 'detail';

    return (
        <div className="h-screen w-full flex justify-center bg-background text-primary font-sans overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface to-background transition-colors duration-500">

            {/* Phone container — full width on mobile, centered & framed on sm+ */}
            <div className="relative h-full w-full sm:max-w-md sm:border-x sm:border-border/10 flex flex-col overflow-hidden">

                {/* Main Content */}
                <main className={`flex-1 w-full relative ${isHome ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto no-scrollbar pt-safe-top pb-24 px-4'}`}>
                    <Outlet />
                </main>

                {/* Bottom Nav — hidden on the detail view, which has its own back */}
                {!isDetail && (
                    <nav className="h-20 bg-surface/90 backdrop-blur-md border-t border-border/30 flex justify-around items-center z-50 rounded-t-2xl shadow-glow pb-safe-bottom absolute bottom-0 w-full left-0 animate-slide-up">
                        <NavIcon icon={Home} label={t(language, 'home')} screen="home" active={current === 'home'} onSelect={navigate} />
                        <NavIcon icon={PlusCircle} label={t(language, 'add')} screen="add" active={current === 'add'} onSelect={navigate} />
                        <NavIcon icon={Book} label={t(language, 'journal')} screen="archive" active={current === 'archive'} onSelect={navigate} />
                        <NavIcon icon={User} label={t(language, 'profile')} screen="profile" active={current === 'profile'} onSelect={navigate} />
                    </nav>
                )}

            </div>
        </div>
    );
}

/**
 * Gate for everything behind sign-in. An unauthenticated visitor to a deep
 * link is sent to /login with the destination remembered, so signing in lands
 * them where they were going rather than dumping them on the home screen.
 */
function RequireAuth() {
    const { currentUser, authLoading } = useDreamStore();
    const location = useLocation();

    if (authLoading) return <LoadingScreen />;
    if (!currentUser) return <Navigate to={paths.login} replace state={{ from: location }} />;

    return <AppShell />;
}

function LoginRoute() {
    const { currentUser, authLoading } = useDreamStore();
    const location = useLocation();

    if (authLoading) return <LoadingScreen />;

    if (currentUser) {
        const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
        return <Navigate to={from ?? paths.home} replace />;
    }

    return <LoginScreen />;
}

function AddRoute() {
    const { mode } = useParams<{ mode: string }>();
    const navigate = useScreenNavigate();
    return <AddDreamScreen onNavigate={navigate} initialMode={mode === 'record' ? 'record' : 'write'} />;
}

function DetailRoute() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    if (!id) return <Navigate to={paths.archive} replace />;

    // React Router labels the first entry of a session "default". Anything
    // else means the user reached this screen from inside the app, so Back
    // can return them there with the archive's search term intact.
    //
    // window.history.length would be wrong here: it counts pages from other
    // sites in the same tab, so arriving from a search engine would make Back
    // leave the app entirely.
    const cameFromInsideTheApp = location.key !== 'default';

    return (
        <DreamDetailScreen
            dreamId={id}
            onBack={() => (cameFromInsideTheApp ? navigate(-1) : navigate(paths.archive))}
        />
    );
}

function ScreenWithNavigate({ Component }: { Component: ComponentType<{ onNavigate: NavigateFn }> }) {
    const navigate = useScreenNavigate();
    return <Component onNavigate={navigate} />;
}

/** Router-free so tests can mount it inside a MemoryRouter. */
export function AppRoutes() {
    const { checkAuth } = useDreamStore();

    // Validate the stored JWT once on mount — keeps the user signed in across
    // a reload, which now matters more since a reload keeps its URL.
    useEffect(() => { checkAuth(); }, [checkAuth]);

    return (
        <Routes>
            <Route path={paths.login} element={<LoginRoute />} />

            <Route element={<RequireAuth />}>
                <Route path={paths.home} element={<ScreenWithNavigate Component={HomeScreen} />} />
                <Route path="/add" element={<Navigate to={paths.add('write')} replace />} />
                <Route path="/add/:mode" element={<AddRoute />} />
                <Route path={paths.archive} element={<ScreenWithNavigate Component={ArchiveScreen} />} />
                <Route path={paths.models} element={<ScreenWithNavigate Component={ModelsScreen} />} />
                <Route path="/dream/:id" element={<DetailRoute />} />
                <Route path={paths.profile} element={<ScreenWithNavigate Component={ProfileScreen} />} />
            </Route>

            {/* Anything unrecognised goes home rather than rendering nothing. */}
            <Route path="*" element={<Navigate to={paths.home} replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}
