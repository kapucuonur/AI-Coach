import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Activity, Battery, Moon, Zap, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import client from '../api/client';

export function MetricDetailModal({ metricType, onClose, date: initialDate }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);

    // Metric configurations
    const configs = {
        heart_rate: {
            title: "Heart Rate",
            icon: Heart,
            color: "#ef4444", // red-500
            gradientId: "colorHr",
            dataKey: "heart_rate",
        },
        body_battery: {
            title: "Body Battery",
            icon: Battery,
            color: "#3b82f6", // blue-500
            gradientId: "colorBb",
            dataKey: "body_battery",
        },
        stress: {
            title: "Stress",
            icon: Activity,
            color: "#f97316", // orange-500
            gradientId: "colorStress",
            dataKey: "stress",
        },
        sleep: {
            title: "Sleep",
            icon: Moon,
            color: "#a855f7", // purple-500
            gradientId: "colorSleep",
            dataKey: "sleep",
        },
        vo2_max: {
            title: "VO2 Max",
            icon: Zap,
            color: "#eab308", // yellow-500
            gradientId: "colorVo2",
            dataKey: "vo2_max",
        }
    };

    const config = configs[metricType] || configs.heart_rate;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await client.get('/dashboard/charts', { params: { date } });
                setData(res.data);
            } catch (error) {
                console.error("Failed to fetch chart data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [date]);

    // Formatters and Processors
    const formatTime = (ts) => {
        if (!ts) return '';
        // Heuristic: If timestamp is in seconds (small number), mul by 1000
        const dateObj = new Date(ts < 10000000000 ? ts * 1000 : ts);
        if (isNaN(dateObj.getTime())) return '';
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const processHR = () => {
        if (!data?.heart_rate?.heartRateValues) return [];
        return data.heart_rate.heartRateValues
            .filter(pt => pt[1] !== null)
            .map(pt => ({
                time: pt[0], // timestamp
                value: pt[1],
                label: formatTime(pt[0])
            }));
    };

    // Process Body Battery
    const processBodyBattery = () => {
        // Handle different possible payload structures
        const bbData = data?.body_battery;
        if (!bbData) return [];

        let values = [];
        if (Array.isArray(bbData)) {
            values = bbData;
        } else if (bbData.bodyBatteryValuesArray) {
            values = bbData.bodyBatteryValuesArray;
        }

        if (!values || values.length === 0) return [];

        return values.map(pt => ({
            time: pt[0],
            value: pt[1],
            label: formatTime(pt[0])
        }));
    };

    // Process Stress
    const processStress = () => {
        if (!data?.stress?.stressValuesArray) return [];
        return data.stress.stressValuesArray
            .filter(pt => pt[1] > 0)
            .map(pt => ({
                time: pt[0],
                value: pt[1],
                label: formatTime(pt[0])
            }));
    };

    // Process VO2 Max
    const processVO2Max = () => {
        if (!data?.vo2_max) return [];
        return data.vo2_max.map((pt, i) => ({
            time: pt[0],
            value: pt[1],
            label: i === 0 ? 'Daily Avg' : ''
        }));
    };

    // Process Sleep
    const processSleep = () => {
        if (!data?.sleep?.dailySleepDTO?.sleepLevels) return [];

        // Count durations for summary chart
        const levels = data.sleep.dailySleepDTO.sleepLevels;
        const summary = [
            { name: 'Deep', duration: 0, color: '#1d4ed8' },   // blue-700
            { name: 'Light', duration: 0, color: '#60a5fa' },  // blue-400
            { name: 'REM', duration: 0, color: '#a855f7' },    // purple-500
            { name: 'Awake', duration: 0, color: '#f472b6' }   // pink-400
        ];

        const sumDuration = (list, key) => {
            if (!list) return;
            const totalSec = list.reduce((acc, curr) => acc + (curr.endTimeInSeconds - curr.startTimeInSeconds), 0);
            const idx = summary.findIndex(s => s.name === key);
            if (idx >= 0) summary[idx].duration = Math.round(totalSec / 60); // minutes
        };

        sumDuration(levels.deep, 'Deep');
        sumDuration(levels.light, 'Light');
        sumDuration(levels.rem, 'REM');
        sumDuration(levels.awake, 'Awake');

        return summary.filter(s => s.duration > 0);
    };

    // Render logic
    const renderContent = () => {
        if (loading) return (
            <div className="h-64 flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-500" size={32} />
            </div>
        );

        if (!data) return <div className="text-center text-gray-500 py-12">No data available</div>;

        if (metricType === 'sleep') {
            const chartData = processSleep();
            if (chartData.length === 0) return <div className="text-center text-gray-500 py-12">No sleep data recorded</div>;

            return (
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" stroke="#9ca3af" width={60} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: '#171717', borderColor: '#374151' }}
                                formatter={(val) => [`${Math.floor(val / 60)}h ${val % 60}m`, 'Duration']}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="duration" radius={[0, 4, 4, 0]} barSize={40}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-6">
                        {chartData.map(d => (
                            <div key={d.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                                <span className="text-sm text-gray-400">
                                    {d.name}: <span className="text-white font-medium">{Math.floor(d.duration / 60)}h {d.duration % 60}m</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Line/Area Charts for HR, Stress, BB
        let chartData = [];
        if (metricType === 'heart_rate') chartData = processHR();
        if (metricType === 'body_battery') chartData = processBodyBattery();
        if (metricType === 'stress') chartData = processStress();
        if (metricType === 'vo2_max') chartData = processVO2Max();

        if (chartData.length === 0) return <div className="text-center text-gray-500 py-12">No time-series data available</div>;

        return (
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis
                            dataKey="label"
                            stroke="#9ca3af"
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            interval="preserveStartEnd"
                            minTickGap={50}
                        />
                        <YAxis stroke="#9ca3af" domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 10 }} width={30} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#171717', borderColor: '#374151', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#9ca3af' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={config.color}
                            fill={`url(#${config.gradientId})`}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <div className="absolute inset-0" onClick={onClose}></div>
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-opacity-10`} style={{ backgroundColor: `${config.color}20` }}>
                                <config.icon size={24} style={{ color: config.color }} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{config.title}</h2>
                                <p className="text-gray-400 text-xs uppercase tracking-wider">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chart Container */}
                    <div className="p-6 md:p-8 overflow-y-auto">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                            {renderContent()}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default MetricDetailModal;
