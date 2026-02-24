import React, { useEffect, useState } from 'react';
import { AnimatePresence } from "framer-motion";
import { X, Loader2 } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import client from '../api/client';

export function MetricDetailModal({ metricKey, title, unit, color = "#3b82f6", onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // Fetch last 14 days
                const res = await client.get('/dashboard/health-history?days=14');
                setHistory(res.data);
            } catch (err) {
                console.error("Failed to fetch history", err);
                setError("Could not load history data.");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    // Helper to extract data
    const getDataKey = (key) => {
        // Map conceptual keys to history data fields
        const map = {
            'resting_hr': 'resting_hr',
            'stress': 'stress',
            'body_battery': 'body_battery_max', // Show max charged
            'sleep': 'sleep_seconds', // needs conversion to hours
            'vo2_max': 'vo2_max' // Not likely in daily stats but placeholder
        };
        return map[key] || key;
    };

    const dataKey = getDataKey(metricKey);

    const formatData = (data) => {
        if (metricKey === 'sleep') {
            return data.map(d => ({
                ...d,
                displayDate: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
                val: d.sleep_seconds ? +(d.sleep_seconds / 3600).toFixed(1) : null
            }));
        }
        return data.map(d => ({
            ...d,
            displayDate: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
            val: d[dataKey]
        }));
    };

    const chartData = formatData(history);
    // Filter out nulls for nicer charts
    const validData = chartData.filter(d => d.val !== null);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-4xl bg-white dark:bg-garmin-gray rounded-2xl shadow-2xl overflow-hidden border border-white/10"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title} Trends</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Last 14 Days Analysis</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={24} className="text-gray-500 dark:text-gray-300" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 h-[400px]">
                        {loading && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                Loading data...
                            </div>
                        )}

                        {error && (
                            <div className="h-full flex items-center justify-center text-red-400">
                                {error}
                            </div>
                        )}

                        {!loading && !error && validData.length === 0 && (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                No history data available for this metric.
                            </div>
                        )}

                        {!loading && !error && validData.length > 0 && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={validData}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                    <XAxis
                                        dataKey="displayDate"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={['auto', 'auto']}
                                        unit={unit === '%' ? '' : unit} // Recharts unit can be duplicative
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                        itemStyle={{ color: color }}
                                        formatter={(value) => [`${value} ${unit}`, title]}
                                        labelStyle={{ color: '#9ca3af' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="val"
                                        stroke={color}
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorVal)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
