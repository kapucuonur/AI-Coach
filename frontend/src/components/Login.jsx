import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Lock, ArrowRight, Zap, HeartPulse, Gauge, UserPlus } from 'lucide-react';
import client from '../api/client';
import { GoogleLogin } from '@react-oauth/google';
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


    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError('');
        try {
            const response = await client.post('/auth/google', { credential: credentialResponse.credential });
            const { access_token, has_garmin_connected } = response.data;
            onLogin(access_token, has_garmin_connected);
        } catch (err) {
            console.error("Google Auth Error:", err);
            setError(err.response?.data?.detail || "Google Login failed.");
            setLoading(false);
        }
    };

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
                                    {isRegistering ? <UserPlus className="text-white" size={20} /> : <Lock className="text-white" size={20} />}
                                </div>
                                <h2 className="text-2xl font-semibold">
                                    {isRegistering ? "Create Account" : "Login"}
                                </h2>
                                <p className="text-sm text-gray-400">
                                    {isRegistering ? "Join CoachOnur - AI Training today" : "Enter your CoachOnur - AI Training credentials"}
                                </p>
                            </div>

                            {/* --- FORM OR LOADING SCREEN --- */}
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
                                            <label className="mb-1 block text-xs font-medium text-gray-400">Password</label>
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
                                            {isRegistering ? "Sign Up" : "Sign In"}
                                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                        </button>

                                        <div className="relative my-6">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-white/10"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs text-gray-400">
                                                <span className="bg-[#111] px-2 shadow-inner">OR CONTINUE WITH</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <GoogleLogin
                                                onSuccess={handleGoogleSuccess}
                                                onError={() => setError("Google Login Failed")}
                                                useOneTap
                                                theme="filled_black"
                                                shape="circle"
                                                size="large"
                                            />

                                            <FacebookLogin
                                                appId={FACEBOOK_APP_ID}
                                                onSuccess={(response) => {
                                                    // The response object contains the accessToken
                                                    handleFacebookResponse({ accessToken: response.accessToken });
                                                }}
                                                onFail={(error) => {
                                                    console.warn('Facebook Login Failed!', error);
                                                    setError("Facebook Login failed.");
                                                }}
                                                onProfileSuccess={(response) => {
                                                    console.log('Get Profile Success!', response);
                                                }}
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
                                                onClick={() => {
                                                    setIsRegistering(!isRegistering);
                                                    setError('');
                                                }}
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
        </div>
    );
}
