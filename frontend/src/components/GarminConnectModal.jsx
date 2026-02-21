import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Lock, ArrowRight, X } from 'lucide-react';
import client from '../api/client';

export function GarminConnectModal({ onConnected }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await client.post('/auth/connect-garmin', {
                garmin_email: email,
                garmin_password: password
            });
            onConnected();
        } catch (err) {
            console.error("Garmin Connect Error:", err);
            setError(err.response?.data?.detail || "Failed to connect to Garmin. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* The background is blurred by the parent, but we add a dark overlay here for focus */}
            <div className="absolute inset-0 bg-black/50" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-garmin-dark/90 backdrop-blur-xl shadow-2xl"
            >
                <div className="p-8">
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20">
                            <Activity className="text-blue-400" size={32} />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Connect Garmin</h2>
                        <p className="text-gray-400 text-sm">
                            Link your Garmin account to pull your health metrics, activities, and generate your personalized coaching plan.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Garmin Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                placeholder="athlete@example.com"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Garmin Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                placeholder="••••••••"
                                required
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-red-400 text-sm text-center bg-red-900/20 p-3 rounded-xl border border-red-500/20"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-blue-500/25 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? (
                                <span className="animate-pulse">Connecting to Garmin...</span>
                            ) : (
                                <>
                                    <Lock size={18} className="mr-1" />
                                    <span>Sync Account securely</span>
                                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>

                        <p className="mt-6 text-center text-xs text-gray-500 max-w-xs mx-auto">
                            We use industry-standard encryption to protect your Garmin credentials.
                        </p>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
