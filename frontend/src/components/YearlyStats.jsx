
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Zap, Activity } from 'lucide-react';
import client from '../api/client';

export function YearlyStats() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await client.get('/garmin/stats/yearly');
                // Transform { 2024: { running: 100, cycling: 200 }, ... } 
                // to [{ year: '2024', running: 100, cycling: 200 }, ...]

                const transformedData = Object.entries(response.data).map(([year, sports]) => ({
                    year,
                    ...sports
                })).sort((a, b) => a.year.localeCompare(b.year)); // Sort by year ascending

                setData(transformedData);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch yearly stats:', err);
                setError('Could not load yearly statistics.');
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 animate-pulse h-64 flex items-center justify-center">
                <span className="text-gray-400">Loading charts...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 h-64 flex items-center justify-center text-red-400">
                {error}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return null; // Don't show if no data
    }

    // Determine active sports for the chart keys
    const allKeys = new Set();
    data.forEach(item => Object.keys(item).forEach(key => {
        if (key !== 'year' && key !== 'error') allKeys.add(key);
    }));
    const sportKeys = Array.from(allKeys);

    // Color map for activities
    const colors = {
        running: '#3b82f6', // blue
        cycling: '#ef4444', // red
        swimming: '#06b6d4', // cyan
        strength_training: '#a855f7', // purple
        hiking: '#22c55e', // green
        walking: '#f59e0b', // amber
        other: '#9ca3af'   // gray
    };

    // Helper to get color with fallback
    const getColor = (sport) => colors[sport] || '#' + Math.floor(Math.random() * 16777215).toString(16);

    // Calculate totals for summary
    const currentYear = new Date().getFullYear().toString();
    const currentYearData = data.find(d => d.year === currentYear) || {};
    const totalKmThisYear = sportKeys.reduce((sum, sport) => sum + (currentYearData[sport] || 0), 0);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <TrendingUp size={20} className="text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Yearly Progression</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total distance (km) by sport</p>
                    </div>
                </div>

                <div className="text-right hidden sm:block">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(totalKmThisYear).toLocaleString()} <span className="text-base font-normal text-gray-500">km</span></div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">{currentYear} Total</div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 0,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                        <XAxis
                            dataKey="year"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            dx={-10}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                borderRadius: '0.5rem',
                                border: 'none',
                                color: '#f3f4f6'
                            }}
                            itemStyle={{ color: '#d1d5db' }}
                            cursor={{ fill: 'transparent' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />
                        {sportKeys.map((sport) => (
                            <Bar
                                key={sport}
                                dataKey={sport}
                                stackId="a"
                                fill={getColor(sport)}
                                radius={[4, 4, 0, 0]} // Only top corners rounded for the top bar? No, this applies to all.
                                // Stacked bars: only top one should have radius. Recharts handles this awkwardly.
                                // Let's just remove radius for stacked, or keep it small.
                                maxBarSize={50}
                                name={sport.charAt(0).toUpperCase() + sport.slice(1).replace('_', ' ')}
                                animationDuration={1500}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Mini stats for current year */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                {sportKeys.slice(0, 4).map(sport => (
                    currentYearData[sport] > 0 && (
                        <div key={sport} className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{sport.replace('_', ' ')}</span>
                            <span className="text-lg font-semibold text-gray-900 dark:text-white" style={{ color: getColor(sport) }}>
                                {currentYearData[sport]} <span className="text-xs text-gray-400">km</span>
                            </span>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}
