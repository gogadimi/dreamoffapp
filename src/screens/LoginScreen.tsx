import { useState, FormEvent, ReactNode } from 'react';
import { useDreamStore } from '../hooks/useDreamStore';
import { User, Lock, Mail, ArrowRight, Moon } from 'lucide-react';

const INPUT_CLASS =
    'w-full bg-[#0d1117]/80 border border-gray-800/80 rounded-2xl py-4 pl-12 pr-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-900/50 focus:ring-1 focus:ring-red-900/20 transition-all duration-300';

const SOCIAL_BTN_CLASS =
    'w-full bg-[#0d1117]/60 hover:bg-[#161b22] active:scale-[0.98] border border-gray-800/60 hover:border-gray-700 rounded-2xl py-4 px-5 flex items-center gap-3 font-medium text-gray-300 transition-all duration-300';

const ICON_BOX_CLASS =
    'w-9 h-9 rounded-xl bg-white/5 border border-gray-800/60 flex items-center justify-center flex-shrink-0';

function SocialButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: ReactNode }) {
    return (
        <button type="button" onClick={onClick} className={SOCIAL_BTN_CLASS}>
            <div className={ICON_BOX_CLASS}>{icon}</div>
            {/* centered text — balanced with equal spacer on the right */}
            <span className="flex-1 text-center text-sm tracking-wide">{label}</span>
            <div className="w-9 flex-shrink-0" />
        </button>
    );
}

export default function LoginScreen() {
    const { loginUser, registerUser } = useDreamStore();
    const [isLogin, setIsLogin] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLogin) {
                const result = await loginUser(email, password);
                if (!result.success) setError(result.error ?? 'Login failed.');
            } else {
                if (!name || !email || !password) { setError('All fields are required'); setIsLoading(false); return; }
                const result = await registerUser(name, email, password);
                if (!result.success) setError(result.error ?? 'Registration failed.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0d1117] px-4 font-sans text-gray-100 selection:bg-red-500/30">
            <div className="w-full max-w-md bg-[#161b22]/40 p-8 rounded-[40px] border border-gray-800/50 backdrop-blur-xl shadow-2xl relative overflow-hidden">

                {/* Ambient glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-900/10 blur-[80px] rounded-full pointer-events-none" />

                {/* ── Header ── */}
                <div className="flex flex-col items-center mb-10 mt-2">
                    <div className="w-20 h-20 bg-[#161b22] rounded-[24px] flex items-center justify-center mb-8 border border-gray-700/50 shadow-xl group hover:border-amber-200/30 transition-all duration-500">
                        <Moon className="w-9 h-9 text-amber-100/90 fill-amber-100/10 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h1 className="text-4xl font-serif text-[#f0e6d2] mb-3 tracking-tight font-medium">
                        {isLogin ? 'Welcome Back' : 'Join DreamOff'}
                    </h1>
                    <p className="text-gray-500 text-[15px] italic font-light tracking-wide">
                        {isLogin ? 'Enter the realm of dreams' : 'Begin your journey into the deep mind'}
                    </p>
                </div>

                {/* ── Form ── */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-red-400 transition-colors duration-300" />
                            <input type="text" placeholder="Your Name" value={name}
                                onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
                        </div>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-red-400 transition-colors duration-300" />
                        <input type="email" placeholder="Email Address" value={email}
                            onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-red-400 transition-colors duration-300" />
                        <input type="password" placeholder="Password" value={password}
                            onChange={(e) => setPassword(e.target.value)} className={INPUT_CLASS} />
                    </div>

                    {error && (
                        <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-3">
                            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
                        </div>
                    )}

                    <button type="submit" disabled={isLoading}
                        className="w-full bg-[#8b0000] hover:bg-[#a00000] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl py-4 font-bold shadow-lg shadow-red-950/40 transition-all duration-300 flex items-center justify-center gap-3 group mt-6">
                        <span className="tracking-wide">
                            {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
                        </span>
                        {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />}
                    </button>
                </form>

                {/* ── Divider ── */}
                <div className="relative my-8 px-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-800/60" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-[#12161d] px-4 text-[10px] uppercase font-bold tracking-[0.2em] text-gray-600">
                            Or continue with
                        </span>
                    </div>
                </div>

                {/* ── Social buttons — all equal ── */}
                <div className="space-y-3">
                    <SocialButton label="Continue with Google" onClick={() => {}}
                        icon={
                            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        }
                    />

                    <SocialButton label="Continue with Apple" onClick={() => {}}
                        icon={
                            <svg className="w-[18px] h-[18px] fill-gray-200" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.38-1.09-.54-2.08-.51-3.2.03-1.42.66-2.58.5-3.69-.64 4.54-7.55 8.12-4.14 7.6 1.77 1.33.2 2.37-3.92 5.09-3.79.84.04 1.54.34 2.03.88-1.74 1.09-1.45 3.31.25 4.37-.58 1.45-1.5 3.35-2.73 4.58-.57.57-1.18.99-1.75 1.09-.16-.27-.33-.55-.52-.82-.54-1.07-.63-1.63 0-2.85zm-4.32-9.7c.6-1.55 2.15-2.85 4.2-2.92.21 2.03-1.68 4.24-4.2 2.92z" />
                            </svg>
                        }
                    />

                    <SocialButton label="Continue with Facebook" onClick={() => {}}
                        icon={
                            <svg className="w-[18px] h-[18px] fill-[#1877F2]" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        }
                    />
                </div>

                {/* ── Footer ── */}
                <div className="mt-10 text-center">
                    <p className="text-gray-500 text-sm">
                        {isLogin ? "Don't have an account?" : 'Already have an account?'}
                        <button onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="ml-2 text-red-500 hover:text-red-400 font-semibold transition-colors duration-300 hover:underline underline-offset-4">
                            {isLogin ? 'Sign up' : 'Login'}
                        </button>
                    </p>
                    <p className="text-[10px] text-gray-700/60 mt-6 tracking-tight">
                        Local Authentication System. Credentials are secure.
                    </p>
                </div>

            </div>
        </div>
    );
}
