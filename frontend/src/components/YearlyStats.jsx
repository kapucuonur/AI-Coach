import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Zap, Activity } from 'lucide-react';
import client from '../api/client';

export function YearlyStats() {
    const { t } = useTranslation();
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

    // Determine active sports for the chart keys (excluding elevation for bars)
    const allKeys = new Set();
    data.forEach(item => Object.keys(item).forEach(key => {
        if (key !== 'year' && key !== 'error' && !key.endsWith('_elevation')) {
            allKeys.add(key);
        }
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

    // Helper to get color with fallback. Use a hash instead of random for stability
    const getColor = (sport) => {
        if (colors[sport]) return colors[sport];
        let hash = 0;
        for (let i = 0; i < sport.length; i++) {
            hash = sport.charCodeAt(i) + ((hash << 5) - hash);
        }
        return '#' + (hash & 0x00FFFFFF).toString(16).padStart(6, '0');
    };

    // Calculate totals for summary
    const currentYear = new Date().getFullYear().toString();
    const currentYearData = data.find(d => d.year === currentYear) || {};
    const totalKmThisYear = sportKeys.reduce((sum, sport) => sum + (currentYearData[sport] || 0), 0);

    // Instead of a React Component inside a component, use a regular function returning JSX
    const renderTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            // Find the original data point for the hovered year
            const yearData = data.find(d => d.year === label) || {};

            return (
                <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-lg shadow-xl text-sm min-w-[150px]">
                    <p className="text-white font-bold mb-2 border-b border-zinc-700 pb-1">{label} {t('total')}</p>
                    <div className="space-y-1.5">
                        {payload.map((entry, index) => {
                            if (entry.value === 0 || !entry.value) return null;
                            const sportKey = entry.dataKey;
                            const elevationKey = `${sportKey}_elevation`;
                            const hasElevation = yearData[elevationKey] != null;

                            return (
                                <div key={index} className="flex flex-col mb-1">
                                    <div className="flex justify-between items-center gap-4">
                                        <span className="flex items-center gap-1.5 text-gray-300">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: entry.color }}
                                            />
                                            <span className="capitalize">{t(entry.name.toLowerCase().replace(' ', '_')) || entry.name}</span>
                                        </span>
                                        <span className="font-semibold text-white">
                                            {entry.value.toLocaleString()} {t('km')}
                                        </span>
                                    </div>
                                    {hasElevation && (
                                        <div className="flex justify-between items-center gap-4 pl-4 text-xs">
                                            <span className="text-gray-400">{t('elevation')}</span>
                                            <span className="text-gray-300">
                                                {yearData[elevationKey].toLocaleString()} {t('m_elev')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <TrendingUp size={20} className="text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('yearly_progression')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('total_distance_elev')}</p>
                    </div>
                </div>

                <div className="text-right hidden sm:block">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(totalKmThisYear).toLocaleString()} <span className="text-base font-normal text-gray-500">{t('km')}</span></div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">{currentYear} {t('total')}</div>
                </div>
            </div>

            <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                        <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                        <Legend
                            verticalAlign="top"
                            align="center"
                            wrapperStyle={{ paddingBottom: '20px' }}
                            iconType="circle"
                        />
                        {sportKeys.map((sport) => (
                            <Bar
                                key={sport}
                                dataKey={sport}
                                stackId="a"
                                fill={getColor(sport)}
                                maxBarSize={50}
                                name={t(sport) || sport.charAt(0).toUpperCase() + sport.slice(1).replace('_', ' ')}
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
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{t(sport) || sport.replace('_', ' ')}</span>
                            <span className="text-lg font-semibold text-gray-900 dark:text-white" style={{ color: getColor(sport) }}>
                                {currentYearData[sport].toLocaleString()} <span className="text-xs text-gray-400">{t('km')}</span>
                            </span>
                            {currentYearData[`${sport}_elevation`] != null && (
                                <span className="text-xs text-gray-500 mt-0.5">
                                    {currentYearData[`${sport}_elevation`].toLocaleString()} {t('m_elev')}
                                </span>
                            )}
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}
