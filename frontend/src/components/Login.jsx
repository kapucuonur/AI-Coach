import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Lock, ArrowRight, Zap, HeartPulse, Gauge, UserPlus } from 'lucide-react';
import client from '../api/client';
import { useGoogleLogin } from '@react-oauth/google';
import FacebookLogin from '@greatsumini/react-facebook-login';

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || "YOUR_FACEBOOK_APP_ID";

export function Login({ onLogin }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const backgroundVideos = [
        {
            src: "/video-run.mp4",
            label: "RUNNING",
            sub: "5K • 10K • Half Marathon • Marathon"
        },
        {
            src: "/video-road-cycle.mp4",
            label: "CYCLING",
            sub: "Road • Gravel • Time Trial • FTP"
        },
        {
            src: "/video-swim.mp4",
            label: "TRIATHLON",
            sub: "Sprint • Olympic • 70.3 • 140.6"
        },
        {
            src: "/video-strength.mp4",
            label: "STRENGTH",
            sub: "Hypertrophy • Power • Mobility • Hyrox"
        }
    ];
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

    // Auto-cycle the active video focus every 4 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentVideoIndex((prev) => (prev + 1) % backgroundVideos.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [backgroundVideos.length]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = { email, password };
            const endpoint = isRegistering ? '/auth/register' : '/auth/login';

            const response = await client.post(endpoint, payload);

            // Expected response: { access_token, token_type, has_garmin_connected }
            const { access_token, has_garmin_connected } = response.data;

            // Pass the token and the garmin connection status to App.jsx
            onLogin(access_token, has_garmin_connected);

        } catch (err) {
            console.error("Auth Error:", err);
            const errorMsg = err.response?.data?.detail || (isRegistering ? "Registration failed." : "Login failed. Check credentials.");
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };


    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError('');
            try {
                const response = await client.post('/auth/google', { credential: tokenResponse.access_token });
                const { access_token, has_garmin_connected } = response.data;
                onLogin(access_token, has_garmin_connected);
            } catch (err) {
                console.error("Google Auth Error:", err);
                setError(err.response?.data?.detail || "Google Login failed.");
                setLoading(false);
            }
        },
        onError: () => setError("Google Login Failed")
    });

    const handleFacebookResponse = async (facebookResponse) => {
        if (!facebookResponse.accessToken) {
            return; // user cancelled login
        }
        setLoading(true);
        setError('');
        try {
            const response = await client.post('/auth/facebook', { accessToken: facebookResponse.accessToken });
            const { access_token, has_garmin_connected } = response.data;
            onLogin(access_token, has_garmin_connected);
        } catch (err) {
            console.error("Facebook Auth Error:", err);
            setError(err.response?.data?.detail || "Facebook Login failed.");
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-black font-sans text-white overflow-x-hidden">

            {/* --- HERO SECTION --- */}
            <section className="relative min-h-[100svh] w-full flex items-center justify-center z-10">

                {/* CINEMATIC ACCORDION BACKGROUND */}
                <div className="absolute inset-0 z-0 flex flex-col md:flex-row bg-black overflow-hidden">
                    {backgroundVideos.map((video, index) => {
                        const isActive = index === currentVideoIndex;
                        return (
                            <motion.div
                                key={index}
                                layout
                                onHoverStart={() => setCurrentVideoIndex(index)}
                                initial={{ flex: 1 }}
                                animate={{ flex: isActive ? 6 : 1 }}
                                transition={{ duration: 0.6, ease: "easeInOut" }}
                                className="relative w-full md:w-auto h-auto md:h-full overflow-hidden border-b md:border-b-0 md:border-r border-white/10 last:border-b-0 last:border-r-0 cursor-pointer group"
                            >
                                <div className={`absolute inset-0 bg-black/40 transition-opacity duration-500 z-10 ${isActive ? "opacity-0" : "opacity-60 hover:opacity-20"}`} />

                                <motion.video
                                    src={video.src}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="h-full w-full object-cover"
                                    layout
                                />

                                <div className={`hidden md:flex absolute inset-0 flex-col items-center z-20 pointer-events-none transition-all duration-500
                                    ${isActive
                                        ? 'justify-end pb-32 md:pb-40 md:justify-end'
                                        : 'justify-center md:justify-end md:pb-40'}
                                `}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{
                                            opacity: isActive ? 1 : 0.7,
                                            y: isActive ? 0 : 0,
                                            scale: isActive ? 1 : 0.9
                                        }}
                                        transition={{ duration: 0.5 }}
                                        className="flex flex-col items-center gap-2 md:gap-0"
                                    >
                                        <h3 className={`font-black tracking-tighter uppercase text-white/90 drop-shadow-xl transition-all duration-500 text-center
                                            ${isActive ? 'text-4xl md:text-7xl mb-2' : 'text-xl md:text-2xl mb-0 rotate-0 md:rotate-0 md:-rotate-90 origin-center md:origin-bottom md:mb-12 opacity-80'}
                                        `}>
                                            {video.label}
                                        </h3>

                                        {isActive && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <p className="text-[10px] md:text-sm font-light tracking-[0.2em] text-blue-100 uppercase bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 shadow-lg">
                                                    {video.sub}
                                                </p>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* HERO MAIN CONTENT */}
                <div className="relative z-20 flex w-full max-w-4xl flex-col items-center justify-start gap-2 px-4 py-4 md:py-0 h-full pointer-events-none pt-8 md:pt-12 pb-32">

                    {/* VISUAL HEADER: MARKETING COPY */}
                    <div className="w-full text-center bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl md:bg-transparent md:backdrop-blur-none md:p-0 md:border-none md:shadow-none pointer-events-auto mt-4 md:mt-0">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 backdrop-blur-md w-fit mx-auto">
                                <Zap size={12} className="text-blue-400" />
                                <span className="text-[10px] md:text-xs font-medium text-blue-200 uppercase tracking-widest">AI Powered</span>
                            </div>
                            <h1 className="mb-2 text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl max-w-3xl mx-auto drop-shadow-lg">
                                Train Smarter, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                                    Not Harder.
                                </span>
                            </h1>
                            <p className="mb-3 text-sm text-gray-200 max-w-lg mx-auto drop-shadow-md font-medium">
                                Turn your Garmin data into a dynamic, adaptive training plan.
                                Your AI coach analyzes your sleep, stress, and recovery to prescribe the perfect workout, every day.
                            </p>

                            <div className="flex flex-wrap gap-3 justify-center text-xs text-gray-300 font-medium mb-2 drop-shadow-md">
                                <div className="flex items-center gap-2"><Activity size={18} /> Adaptive Plans</div>
                                <div className="flex items-center gap-2"><HeartPulse size={18} /> Recovery Analysis</div>
                                <div className="flex items-center gap-2"><Gauge size={18} /> VO2 Max focus</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* ACTIVE SPORT LABEL - MOBILE ONLY */}
                    <div className="flex-1 flex flex-col items-center justify-center w-full md:hidden pointer-events-none z-30 min-h-[100px] mb-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentVideoIndex}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                transition={{ duration: 0.4 }}
                                className="flex flex-col items-center text-center px-4"
                            >
                                <h2 className="text-5xl font-black tracking-tighter uppercase text-white drop-shadow-2xl mb-3">
                                    {backgroundVideos[currentVideoIndex].label}
                                </h2>
                                <p className="text-xs font-light tracking-[0.2em] text-blue-100 uppercase bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 shadow-lg">
                                    {backgroundVideos[currentVideoIndex].sub}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* LOGIN CARD */}
                    <div className="w-full max-w-md pointer-events-auto mx-auto mb-8 md:mb-0 z-40">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto"
                        >
                            <div className="p-6">
                                <div className="mb-4 text-center">
                                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500">
                                        {isRegistering ? <UserPlus className="text-white" size={18} /> : <Lock className="text-white" size={18} />}
                                    </div>
                                    <h2 className="text-xl font-semibold">
                                        {isRegistering ? "Create Account" : "Login"}
                                    </h2>
                                    <p className="text-xs text-gray-400">
                                        {isRegistering ? "Join CoachOnur - AI Training today" : "Enter your CoachOnur credentials"}
                                    </p>
                                </div>

                                <AnimatePresence mode="wait">
                                    {loading ? (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex flex-col items-center justify-center py-8 text-center"
                                        >
                                            <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500"></div>
                                            <h3 className="mb-2 text-lg font-medium text-white">Authenticating...</h3>
                                        </motion.div>
                                    ) : (
                                        <motion.form
                                            key="form"
                                            onSubmit={handleAuth}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="space-y-3"
                                        >
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-400">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                                    placeholder="athlete@example.com"
                                                    required
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-400">Password</label>
                                                <input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                                    placeholder="••••••••"
                                                    required
                                                    disabled={loading}
                                                />
                                            </div>

                                            {error && (
                                                <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-500/20">
                                                    {error}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="group mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                {isRegistering ? "Sign Up" : "Sign In"}
                                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                                            </button>

                                            <div className="relative my-4">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-white/10"></div>
                                                </div>
                                                <div className="relative flex justify-center text-[10px] text-gray-400">
                                                    <span className="bg-[#111] px-2 shadow-inner uppercase">Or continue with</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => loginWithGoogle()}
                                                    className="flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-gray-200 shadow-sm"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
                                                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                                        <path fill="none" d="M0 0h48v48H0z" />
                                                    </svg>
                                                    Google
                                                </button>

                                                <FacebookLogin
                                                    appId={FACEBOOK_APP_ID}
                                                    onSuccess={(response) => handleFacebookResponse({ accessToken: response.accessToken })}
                                                    onFail={() => setError("Facebook Login failed.")}
                                                    render={({ onClick }) => (
                                                        <button
                                                            type="button"
                                                            onClick={onClick}
                                                            className="flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-[#1877F2]/10 px-4 py-2 text-sm font-medium text-[#1877F2] transition-all hover:bg-[#1877F2]/20 shadow-sm"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                                                            </svg>
                                                            Facebook
                                                        </button>
                                                    )}
                                                />
                                            </div>

                                            <p className="mt-4 text-center text-sm text-gray-400">
                                                {isRegistering ? "Already have an account?" : "Don't have an account?"}
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                                                    className="ml-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                                >
                                                    {isRegistering ? "Login here" : "Sign up here"}
                                                </button>
                                            </p>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* SCROLL DOWN INDICATOR */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-auto cursor-pointer" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
                    >
                        <span className="text-[10px] md:text-xs font-medium tracking-widest text-white uppercase bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">Discover More</span>
                        <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg hover:bg-black/60 transition-colors">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* --- ABOUT SERVICE / FEATURES SECTION --- */}
            <section className="relative w-full bg-zinc-950 py-24 px-4 border-t border-white/10 border-b z-20">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text">
                            Next-Generation Training
                        </h2>
                        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
                            We bridge the gap between human coaching expertise and artificial intelligence.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-black/50 border border-white/5 p-8 rounded-3xl hover:bg-white/5 transition-colors group">
                            <Activity className="w-12 h-12 text-blue-400 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-semibold mb-3">Garmin Sync</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Connect your Garmin account once. We automatically pull your activities, sleep data, HRV status, and body battery directly from your device.
                            </p>
                        </div>
                        <div className="bg-black/50 border border-white/5 p-8 rounded-3xl hover:bg-white/5 transition-colors group">
                            <Zap className="w-12 h-12 text-emerald-400 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-semibold mb-3">AI Deep Analysis</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Our AI engine crunches your biometric data daily, mapping your fatigue levels against your training history to determine your true readiness.
                            </p>
                        </div>
                        <div className="bg-black/50 border border-white/5 p-8 rounded-3xl hover:bg-white/5 transition-colors group">
                            <HeartPulse className="w-12 h-12 text-purple-400 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-semibold mb-3">Adaptive Plans</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Forget static 12-week plans. Get a new training prescription every morning tailored to how much time you have and how recovered you are today.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- THE PROCESS (COACH ONUR & AI) --- */}
            <section className="relative w-full bg-black py-24 px-4 z-20">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-6">
                            <Zap size={16} className="text-emerald-400" />
                            <span className="text-sm font-medium text-emerald-200">The Secret Sauce</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
                            How the Program is Made
                        </h2>
                        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
                            The perfect synergy between Coach Onur's decades of endurance coaching experience and state-of-the-art AI.
                        </p>
                    </div>

                    <div className="relative">
                        {/* Process Line */}
                        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-emerald-500/50 to-blue-500/10 hidden md:block" />

                        <div className="space-y-12 md:space-y-24">
                            {/* Step 1 */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16 relative">
                                <div className="md:w-1/2 text-left md:text-right flex flex-col items-start md:items-end w-full pl-16 md:pl-0">
                                    <h3 className="text-2xl font-bold text-white mb-2">1. The Blueprint</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        Coach Onur establishes the foundational training principles, periodization models, and physiological guardrails. The system learns the difference between building aerobic base, increasing lactate threshold, and peaking for race day.
                                    </p>
                                </div>
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-16 h-16 rounded-full bg-black border-4 border-zinc-900 border-t-blue-500 flex items-center justify-center text-xl font-bold z-10">
                                    1
                                </div>
                                <div className="md:w-1/2 w-full pl-16 md:pl-0">
                                    <div className="h-48 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 flex items-center justify-center p-6 text-blue-400">
                                        <svg className="w-16 h-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-8 md:gap-16 relative">
                                <div className="md:w-1/2 text-left flex flex-col items-start w-full pl-16 md:pl-0">
                                    <h3 className="text-2xl font-bold text-white mb-2">2. Data Ingestion</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        Your Garmin throws millions of data points at the AI every day. It looks at your sleep phases, resting heart rate, HRV imbalance, body battery drains, and how hard yesterday's workout actually was compared to what was planned.
                                    </p>
                                </div>
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-16 h-16 rounded-full bg-black border-4 border-zinc-900 border-t-emerald-500 flex items-center justify-center text-xl font-bold z-10">
                                    2
                                </div>
                                <div className="md:w-1/2 w-full pl-16 md:pl-0">
                                    <div className="h-48 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 flex items-center justify-center p-6 text-emerald-400">
                                        <Activity className="w-16 h-16 opacity-50" />
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16 relative">
                                <div className="md:w-1/2 text-left md:text-right flex flex-col items-start md:items-end w-full pl-16 md:pl-0">
                                    <h3 className="text-2xl font-bold text-white mb-2">3. The Engine Room</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        The AI Engine cross-references your real-time physiological readiness against Coach Onur's training matrix. If you slept poorly, it automatically pivots your scheduled VO2 Max session into a Zone 2 active recovery day to prevent overtraining.
                                    </p>
                                </div>
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-16 h-16 rounded-full bg-black border-4 border-zinc-900 border-t-purple-500 flex items-center justify-center text-xl font-bold z-10">
                                    3
                                </div>
                                <div className="md:w-1/2 w-full pl-16 md:pl-0">
                                    <div className="h-48 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 flex items-center justify-center p-6 text-purple-400">
                                        <svg className="w-16 h-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-8 md:gap-16 relative">
                                <div className="md:w-1/2 text-left flex flex-col items-start w-full pl-16 md:pl-0">
                                    <h3 className="text-2xl font-bold text-white mb-2">4. Your Daily Prescription</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        Every day, you inform the app how much time you have to train (e.g., 45 minutes). The AI instantly generates a hyper-specific, custom-tailored workout for that exact time window and your exact readiness state.
                                    </p>
                                </div>
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center text-white text-xl font-bold z-10">
                                    <Zap size={24} />
                                </div>
                                <div className="md:w-1/2 w-full pl-16 md:pl-0">
                                    <div className="h-48 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)] flex items-center justify-center p-6 text-white">
                                        <div className="text-center">
                                            <div className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded inline-block mb-2">GENERATED</div>
                                            <h4 className="font-bold text-lg">Today's Protocol</h4>
                                            <p className="text-sm text-gray-400 mt-1">45min Zone 2 Base</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- MINIMAL FOOTER --- */}
            <footer className="w-full bg-black py-8 border-t border-white/5 z-20 relative">
                <div className="max-w-6xl mx-auto px-4 flex justify-between items-center text-xs md:text-sm text-gray-500">
                    <div className="font-semibold text-gray-300">
                        CoachOnur AI &copy; {new Date().getFullYear()}
                    </div>
                    <div className="flex gap-6">
                        <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
