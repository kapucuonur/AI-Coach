import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Sparkles, Watch, CheckCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import client from '../api/client';
import WorkoutVisualizer from './WorkoutVisualizer';

export function AdviceBlock({ advice, workout }) {
    const { t } = useTranslation();
    const [syncStatus, setSyncStatus] = useState(null); // 'loading', 'success', 'error'

    const handleSync = async () => {
        if (!workout) return;
        setSyncStatus('loading');
        try {
            await client.post('/coach/sync', { workout });
            setSyncStatus('success');
            setTimeout(() => setSyncStatus(null), 3000);
        } catch (error) {
            console.error("Sync failed", error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus(null), 3000);
        }
    };

    // Determine primary sport for icon
    const getSportIcon = () => {
        if (!workout) return <Bot size={24} className="text-garmin-blue" />;
        const type = workout.sportType?.sportTypeKey || '';
        // keywords check
        if (type === 'running' || advice.includes('run')) return <div className="text-2xl">🏃</div>;
        if (type === 'cycling' || advice.includes('ride') || advice.includes('cycle')) return <div className="text-2xl">🚴</div>;
        if (type === 'swimming' || advice.includes('swim')) return <div className="text-2xl">🏊</div>;
        if (type === 'strength_training' || advice.includes('gym') || advice.includes('lift')) return <div className="text-2xl">🏋️</div>;
        return <Bot size={24} className="text-garmin-blue" />;
    };

    return (
        <div className="bg-white dark:bg-garmin-card rounded-2xl p-0 border border-gray-200 dark:border-white/10 shadow-xl relative overflow-hidden group hover:border-garmin-blue/30 transition-all duration-300">
            {/* Header / Coach Profile */}
            <div className="bg-gradient-to-r from-gray-50 to-white dark:from-white/5 dark:to-transparent p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-garmin-blue to-cyan-500 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-white/10">
                        <span className="text-xl">🤖</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{t('ai_performance_coach')}</h2>
                        <div className="flex items-center gap-1 text-xs font-medium text-garmin-blue dark:text-blue-400 uppercase tracking-wider">
                            <Sparkles size={12} />
                            <span>{t('coach_daily_briefing')}</span>
                        </div>
                    </div>
                </div>
                <div className="opacity-80">
                    {getSportIcon()}
                </div>
            </div>

            <div className="p-6 relative z-10">
                <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 font-sans leading-relaxed mb-6 dark:prose-invert">
                    <ReactMarkdown>{advice}</ReactMarkdown>
                </div>

                {/* Visual Workout Builder */}
                {workout && <WorkoutVisualizer workout={workout} />}

                {workout && (
                    <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <button
                            onClick={handleSync}
                            disabled={syncStatus === 'loading' || syncStatus === 'success'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${syncStatus === 'success'
                                ? 'bg-green-500/20 text-green-400'
                                : syncStatus === 'error'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-garmin-blue text-white hover:bg-blue-600'
                                }`}
                        >
                            {syncStatus === 'loading' && <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />}
                            {syncStatus === 'success' && <CheckCircle size={18} />}
                            {syncStatus === 'error' && <AlertCircle size={18} />}

                            {!syncStatus && <Watch size={18} />}

                            {syncStatus === 'loading' && t('sending')}
                            {syncStatus === 'success' && t('sent_to_watch')}
                            {syncStatus === 'error' && t('failed')}
                            {!syncStatus && t('send_to_watch')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
