import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Heart, Clock, Zap, MapPin, Gauge } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import ReactMarkdown from 'react-markdown';
import client from '../api/client';

export function ActivityAnalysis({ activityId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await client.get(`/dashboard/activities/${activityId}/details`);
                setData(response.data);
            } catch (err) {
                console.error("Failed to fetch activity details:", err);
                setError("Could not load activity details.");
            } finally {
                setLoading(false);
            }
        };

        if (activityId) {
            fetchData();
        }
    }, [activityId]);

    if (!activityId) return null;

    // Helper to process chart data from splits or details
    // Often specialized streams are needed for high-res charts. 
    // If not available, we can use splits (laps) as a coarser data source or see if 'full_details' has it.
    // For now, let's try to visualize splits since they are reliable.
    // Garmin API uses summaryDTO wrapper or root level fields
    const summary = data?.details?.summaryDTO || data?.details || {};
    const chartData = data?.details?.splitSummaries?.map((split, index) => ({
        name: `Lap ${index + 1}`,
        distance: Math.round(split.distance || 0),
        avgHR: split.averageHR || split.average_hr,
        avgSpeed: split.averageSpeed || split.average_speed,
        pace: (split.averageSpeed || split.average_speed) ? (1000 / (split.averageSpeed || split.average_speed)) / 60 : 0
    })) || [];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-5xl h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Activity className="text-blue-500" />
                                {data?.details?.activityName || "Activity Analysis"}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                {data?.details?.startTimeLocal && new Date(data.details.startTimeLocal).toLocaleString()}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 space-y-8 flex-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                                <p className="text-gray-400 animate-pulse">Analyzing performance data...</p>
                            </div>
                        ) : error ? (
                            <div className="text-red-400 text-center p-8 bg-red-900/10 rounded-xl border border-red-500/20">
                                {error}
                            </div>
                        ) : (
                            <>
                                {/* AI Coach Analysis */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Stats Cards */}
                                    <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4">
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                                            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-widest">Distance</p>
                                                <p className="text-xl font-bold text-white">{((summary.distance || 0) / 1000).toFixed(2)} <span className="text-sm font-normal text-gray-500">km</span></p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                                            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-widest">Duration</p>
                                                <p className="text-xl font-bold text-white">{((summary.duration || summary.elapsedDuration || 0) / 60).toFixed(0)} <span className="text-sm font-normal text-gray-500">min</span></p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                                            <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
                                                <Heart size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-widest">Avg HR</p>
                                                <p className="text-xl font-bold text-white">{Math.round(summary.averageHR || summary.avgHr || 0)} <span className="text-sm font-normal text-gray-500">bpm</span></p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                                            <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400">
                                                <Gauge size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-widest">Max HR</p>
                                                <p className="text-xl font-bold text-white">{Math.round(summary.maxHR || summary.maxHr || 0)} <span className="text-sm font-normal text-gray-500">bpm</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Insights */}
                                    <div className="lg:col-span-2 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 p-6 rounded-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Zap size={120} className="text-blue-500 transform rotate-12" />
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-lg font-bold text-blue-100 flex items-center gap-2 mb-4">
                                                <Zap size={18} className="text-blue-400" />
                                                Coach's Analysis
                                            </h3>
                                            <div className="prose prose-invert prose-sm max-w-none">
                                                <p className="text-gray-300 leading-relaxed whitespace-pre-line text-base">
                                                    {data?.analysis?.feedback || "No analysis available"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts Section - Using Splits for now as we don't have robust stream logic yet */}
                                {/* Heart Rate Chart */}
                                <div className="space-y-6">
                                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <Heart size={18} className="text-red-500" />
                                            Heart Rate Profile (Per Lap)
                                        </h3>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                    <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} domain={['dataMin - 10', 'auto']} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #374151', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#fff' }}
                                                    />
                                                    <Area type="monotone" dataKey="avgHR" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorHr)" activeDot={{ r: 6 }} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Pace Chart */}
                                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <Activity size={18} className="text-blue-500" />
                                            Pace Profile (Per Lap - min/km)
                                        </h3>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient id="colorPace" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                    <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} reversed={true} domain={['dataMin', 'dataMax']} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #374151', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        formatter={(value) => [`${Math.floor(value)}:${Math.round((value % 1) * 60).toString().padStart(2, '0')}`, 'Pace']}
                                                    />
                                                    <Area type="monotone" dataKey="pace" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPace)" activeDot={{ r: 6 }} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
