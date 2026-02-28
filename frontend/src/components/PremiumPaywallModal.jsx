import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, X, Activity, Zap, ShieldCheck } from 'lucide-react';
import client from '../api/client';

export function PremiumPaywallModal({ isOpen, onClose }) {
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            // Call our new backend endpoint to get the Stripe Checkout Session URL
            const response = await client.post('/payments/create-checkout-session');
            const { url } = response.data;

            // Redirect to Stripe's hosted checkout page
            if (url) {
                window.location.href = url;
            }
        } catch (error) {
            console.error("Failed to create checkout session:", error);
            alert("Payment setup encountered an error. Please try again.");
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gray-900/90 shadow-2xl backdrop-blur-xl"
                    >
                        {/* Glow Effect */}
                        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/20 blur-[80px]" />
                        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/20 blur-[80px]" />

                        <div className="relative p-8">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            {/* Icon Header */}
                            <div className="mb-6 flex justify-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/20">
                                    <Crown className="text-white" size={32} />
                                </div>
                            </div>

                            {/* Title & Description */}
                            <div className="text-center">
                                <h2 className="mb-2 text-2xl font-bold text-white flex items-center justify-center gap-2">
                                    Unlock Premium <Sparkles className="text-yellow-400" size={20} />
                                </h2>
                                <p className="mb-8 text-sm text-gray-400">
                                    You are currently viewing the dashboard for free. Upgrade to CoachOnur Pro to interact with AI models and get actionable performance guidance. Start your 1-week free trial today!
                                </p>
                            </div>

                            {/* Features List */}
                            <div className="mb-8 space-y-4">
                                <div className="flex items-start gap-4 rounded-xl bg-white/5 p-4 border border-white/5">
                                    <Activity className="mt-1 text-blue-400" size={20} />
                                    <div>
                                        <h4 className="font-semibold text-white">Daily AI Workouts</h4>
                                        <p className="text-xs text-gray-400">Custom schedules built completely dynamically around your stress, sleep, and fitness trends.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 rounded-xl bg-white/5 p-4 border border-white/5">
                                    <Zap className="mt-1 text-emerald-400" size={20} />
                                    <div>
                                        <h4 className="font-semibold text-white">Interactive Insights</h4>
                                        <p className="text-xs text-gray-400">Click and interact with all your metrics to instantly generate detailed AI coaching advice.</p>
                                    </div>
                                </div>
                            </div>

                            {/* CTA Button */}
                            <button
                                onClick={handleUpgrade}
                                disabled={loading}
                                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 px-6 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {loading ? (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    ) : (
                                        <>Upgrade to Pro Now <Crown size={18} /></>
                                    )}
                                </span>
                                {/* Hover Gradient Overlay */}
                                <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>

                            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                                <ShieldCheck size={14} />
                                securely processed by Stripe
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
