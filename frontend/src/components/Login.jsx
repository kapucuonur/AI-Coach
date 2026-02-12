import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Lock, ArrowRight, Zap, HeartPulse, Gauge } from 'lucide-react';
import client from '../api/client';

// --- PAZARLAMA İÇİN YÜKLEME MESAJLARI ---
// Render.com waking up messages
const LOADING_MESSAGES = [
    "AI Coach is waking up...",
    "Establishing secure connection to Garmin...",
    "Analyzing your last 30 days of training...",
    "Calculating acute training load...",
    "Optimizing your recovery metrics...",
    "Generating metabolic profile..."
];

export function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [showMfa, setShowMfa] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
    const [loadingText, setLoadingText] = useState("Authenticating...");

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

    // Loading message cycle
    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [loading]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                email,
                password,
                mfaCode: mfaCode || null
            };

            const response = await client.post('/coach/daily-briefing', payload);

            // If successful, pass data and credentials to parent
            onLogin(response.data, payload);
        } catch (err) {
            console.error("Login Error:", err);
            const errorMsg = err.response?.data?.detail || "Login failed. Check credentials.";

            if (errorMsg === "MFA_REQUIRED") {
                setShowMfa(true);
                setError("Garmin sent a verification code to your email. Please into it below.");
            } else {
                setError(errorMsg);
            }
        } finally {
            if (!showMfa) { // Don't stop loading loop if we hit MFA, actually we should stop and let user type
                setLoading(false);
            }
            // Actually, if we hit error (MFA), loading becomes false naturally in finally block?
            // Ah, wait. If error is thrown, we enter catch, set showMfa=true. Then finally runs, setLoading(false).
            // Correct. The UI will switch back to form (with MFA field now visible).
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-y-auto md:overflow-hidden bg-black font-sans text-white">

            {/* --- 1. CINEMATIC ACCORDION BACKGROUND --- */}
            <div className="fixed inset-0 z-0 flex flex-col md:flex-row bg-black">
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

                            {/* Sport Label & Sub-disciplines Overlay (Desktop Only) */}
                            <div className={`hidden md:flex absolute inset-0 flex-col items-center z-20 pointer-events-none transition-all duration-500
                                ${isActive
                                    ? 'justify-end pb-24 md:pb-24 md:justify-end'
                                    : 'justify-center md:justify-end md:pb-24'}
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
                                    {/* Main Title - Responsive sizing */}
                                    <h3 className={`font-black tracking-tighter uppercase text-white/90 drop-shadow-xl transition-all duration-500 text-center
                                        ${isActive ? 'text-4xl md:text-7xl mb-2' : 'text-xl md:text-2xl mb-0 rotate-0 md:rotate-0 md:-rotate-90 origin-center md:origin-bottom md:mb-12 opacity-80'}
                                    `}>
                                        {video.label}
                                    </h3>

                                    {/* Sub-disciplines - Visible only when active */}
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

            {/* --- 2. MAIN CONTENT --- */}
            <div className="relative z-20 flex w-full max-w-3xl flex-col items-center justify-between md:justify-center gap-8 px-4 py-8 md:py-0 h-full md:h-auto min-h-screen md:min-h-0 pointer-events-none md:-mt-24">

                {/* VISUAL HEADER: MARKETING COPY */}
                <div className="text-center bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl md:bg-transparent md:backdrop-blur-none md:p-0 md:border-none md:shadow-none pointer-events-auto mt-4 md:mt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 backdrop-blur-md mx-auto">
                            <Zap size={16} className="text-blue-400" />
                            <span className="text-sm font-medium text-blue-200">AI Powered Performance</span>
                        </div>
                        <h1 className="mb-4 text-2xl font-bold leading-tight tracking-tight md:text-6xl">
                            Train Smarter, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                                Not Harder.
                            </span>
                        </h1>
                        <p className="mb-6 text-sm text-gray-300 md:text-xl max-w-2xl mx-auto">
                            Turn your Garmin data into a dynamic, adaptive training plan.
                            Your AI coach analyzes your sleep, stress, and recovery to prescribe the perfect workout, every day.
                        </p>

                        <div className="flex flex-wrap gap-4 justify-center text-sm text-gray-400 mb-8">
                            <div className="flex items-center gap-2"><Activity size={18} /> Adaptive Plans</div>
                            <div className="flex items-center gap-2"><HeartPulse size={18} /> Recovery Analysis</div>
                            <div className="flex items-center gap-2"><Gauge size={18} /> VO2 Max Optimization</div>
                        </div>
                    </motion.div>
                </div>

                {/* ACTIVE SPORT LABEL - MOBILE ONLY (Centered in the gap) */}
                <div className="flex-1 flex flex-col items-center justify-center w-full md:hidden pointer-events-none z-30">
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

                {/* RIGHT SIDE: LOGIN CARD (GLASSMORPHISM) */}
                <div className="w-full max-w-md pointer-events-auto mb-4 md:mb-0">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl"
                    >
                        <div className="p-8">
                            <div className="mb-8 text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500">
                                    <Lock className="text-white" size={20} />
                                </div>
                                <h2 className="text-2xl font-semibold">Connect Garmin</h2>
                                <p className="text-sm text-gray-400">Sync your history to generate your plan</p>
                            </div>

                            {/* --- FORM OR LOADING SCREEN --- */}
                            <AnimatePresence mode="wait">
                                {loading && !showMfa ? ( // Only show loading if not in MFA state (MFA state is technically 'not loading' but waiting for user input)
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center py-8 text-center"
                                    >
                                        <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500"></div>
                                        <h3 className="mb-2 text-lg font-medium text-white">Analyzing Data...</h3>
                                        <p className="text-sm text-blue-300 animate-pulse">
                                            {LOADING_MESSAGES[loadingMsgIndex]}
                                        </p>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        onSubmit={handleLogin}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-400">Email Address</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                                placeholder="athlete@example.com"
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-400">Garmin Password</label>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                                placeholder="••••••••"
                                                required
                                                disabled={loading}
                                            />
                                        </div>

                                        {showMfa && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-4"
                                            >
                                                <label className="mb-1 block text-xs font-medium text-yellow-400">Verification Code Required</label>
                                                <input
                                                    type="text"
                                                    value={mfaCode}
                                                    onChange={(e) => setMfaCode(e.target.value)}
                                                    className="w-full rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
                                                    placeholder="Enter code from email"
                                                    required
                                                    autoFocus
                                                />
                                            </motion.div>
                                        )}

                                        {error && (
                                            <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-500/20">
                                                {error}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="group mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-semibold text-black transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {showMfa ? "Verify & Login" : "Sync & Generate Plan"}
                                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                        </button>

                                        <p className="mt-4 text-center text-xs text-gray-500">
                                            Your credentials are encrypted and never stored permanently.
                                        </p>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
