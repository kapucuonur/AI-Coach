import { useState, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Activity, Heart, Clock, Zap, MapPin, Gauge, Mountain, Volume2, Square } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import ReactMarkdown from 'react-markdown';
import client from '../api/client';

export function ActivityAnalysis({ activityId, onClose }) {
    const { i18n } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    const toggleSpeech = async () => {
        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        } else {
            if (!data?.analysis) return;
            setIsLoadingAudio(true);
            try {
                // Request generated speech from backend
                const response = await client.post('/tts/generate', {
                    text: data.analysis,
                    language: i18n.language || 'en'
                }, {
                    responseType: 'blob'
                });

                const blob = new Blob([response.data], { type: 'audio/mpeg' });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);

                audio.onended = () => {
                    setIsPlaying(false);
                    URL.revokeObjectURL(url);
                };

                audio.onerror = () => {
                    setIsPlaying(false);
                    setIsLoadingAudio(false);
                    URL.revokeObjectURL(url);
                };

                audioRef.current = audio;
                audio.play();
                setIsPlaying(true);
            } catch (error) {
                console.error("Error generating speech:", error);
                setIsPlaying(false);
            } finally {
                setIsLoadingAudio(false);
            }
        }
    };

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

    // Extract lap data for charts - Garmin usually stores this in details.splits.lapDTOs
    let laps = [];
    if (data?.details?.splits?.lapDTOs) {
        laps = data.details.splits.lapDTOs;
    } else if (Array.isArray(data?.details?.splits)) {
        laps = data.details.splits;
    }

    const chartData = laps.map((split, index) => {
        const avgSpeed = split.averageSpeed || split.average_speed || 0;
        let paceStr = 0;
        let paceNum = 0;

        if (avgSpeed > 0) {
            // Speed is m/s. Pace is min/km. 
            // min/km = (1000 / m/s) / 60
            const pacePerKmSec = 1000 / avgSpeed;
            paceNum = pacePerKmSec / 60; // Decimal minutes
        }

        const avgElevation = split.averageElevation || split.average_elevation || split.elevationGain || null;
        const avgPower = split.averagePower || split.average_power || null;

        return {
            name: `Lap ${index + 1}`,
            distance: Math.round(split.distance || 0),
            avgHR: split.averageHR || split.average_hr || null,
            avgSpeed: avgSpeed,
            pace: paceNum,
            elevation: avgElevation,
            power: avgPower
        };
    }).filter(point => point.avgHR !== null || point.pace > 0 || point.power !== null);

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
                                            <h3 className="text-lg font-bold text-blue-100 flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-2">
                                                    <Zap size={18} className="text-blue-400" />
                                                    Coach's Analysis
                                                </div>
                                                {data?.analysis && (
                                                    <button
                                                        onClick={toggleSpeech}
                                                        disabled={isLoadingAudio}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 shadow-sm ${isLoadingAudio ? 'opacity-50 cursor-not-allowed bg-white/10 text-gray-400' : isPlaying ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/40 hover:text-white'}`}
                                                        title={isPlaying ? "Stop listening" : "Listen to analysis"}
                                                        aria-label="Listen to analysis"
                                                    >
                                                        {isLoadingAudio ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : isPlaying ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
                                                        <span>{isPlaying ? 'PLAYING' : 'LISTEN'}</span>
                                                    </button>
                                                )}
                                            </h3>
                                            <div className="space-y-5">
                                                {data?.analysis ? (
                                                    (() => {
                                                        // Parse sections from AI response
                                                        const text = data.analysis;
                                                        const sections = [];

                                                        // Split by emoji headers
                                                        const parts = text.split(/(?=📊|💓|🎯)/);

                                                        parts.forEach(part => {
                                                            const trimmed = part.trim();
                                                            if (!trimmed) return;

                                                            // Extract header and content
                                                            const lines = trimmed.split('\n');
                                                            const header = lines[0];
                                                            const content = lines.slice(1).join('\n').trim();

                                                            if (header && content) {
                                                                sections.push({ header, content });
                                                            }
                                                        });

                                                        // If no sections found, display as single paragraph
                                                        if (sections.length === 0) {
                                                            return (
                                                                <p className="text-gray-300 leading-relaxed text-base">
                                                                    {text}
                                                                </p>
                                                            );
                                                        }

                                                        // Display parsed sections
                                                        return sections.map((section, idx) => (
                                                            <div key={idx} className="border-l-2 border-blue-400/30 pl-4">
                                                                <h4 className="text-sm font-bold text-blue-200 mb-2 tracking-wide">
                                                                    {section.header}
                                                                </h4>
                                                                <p className="text-gray-300 leading-relaxed text-base">
                                                                    {section.content}
                                                                </p>
                                                            </div>
                                                        ));
                                                    })()
                                                ) : (
                                                    <p className="text-gray-400 italic">No analysis available</p>
                                                )}
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
                                        <div className="w-full relative min-h-[300px]" style={{ height: 300 }}>
                                            <ResponsiveContainer width="99%" height="100%">
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
                                        <div className="w-full relative min-h-[300px]" style={{ height: 300 }}>
                                            <ResponsiveContainer width="99%" height="100%">
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

                                    {/* Elevation Chart */}
                                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <Mountain size={18} className="text-emerald-500" />
                                            Elevation Profile (Per Lap)
                                        </h3>
                                        <div className="w-full relative min-h-[300px]" style={{ height: 300 }}>
                                            <ResponsiveContainer width="99%" height="100%">
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                    <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} domain={['dataMin', 'dataMax + 10']} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #374151', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        formatter={(value) => [`${Math.round(value)}m`, 'Elevation']}
                                                    />
                                                    <Area type="monotone" dataKey="elevation" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorElev)" activeDot={{ r: 6 }} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Power Chart */}
                                    {chartData.some(d => d.power) && (
                                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                                <Zap size={18} className="text-orange-500" />
                                                Power Profile (Per Lap)
                                            </h3>
                                            <div className="w-full relative min-h-[300px]" style={{ height: 300 }}>
                                                <ResponsiveContainer width="99%" height="100%">
                                                    <AreaChart data={chartData}>
                                                        <defs>
                                                            <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                        <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                                                        <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#171717', border: '1px solid #374151', borderRadius: '8px' }}
                                                            itemStyle={{ color: '#fff' }}
                                                            formatter={(value) => [`${Math.round(value)} W`, 'Power']}
                                                        />
                                                        <Area type="monotone" dataKey="power" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorPower)" activeDot={{ r: 6 }} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
