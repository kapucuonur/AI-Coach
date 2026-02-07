import { useState } from 'react';
import { Bot, Sparkles, Watch, CheckCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import client from '../api/client';
import WorkoutVisualizer from './WorkoutVisualizer';

export function AdviceBlock({ advice, workout }) {
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

    return (
        <div className="bg-white dark:bg-garmin-card rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-lg relative overflow-hidden group hover:border-garmin-blue/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-garmin-blue dark:text-white">
                <Bot size={64} />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-garmin-blue dark:text-yellow-400" size={20} />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Coach's Daily Briefing</h2>
                    </div>
                </div>

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

                            {syncStatus === 'loading' && 'Sending...'}
                            {syncStatus === 'success' && 'Sent to Watch!'}
                            {syncStatus === 'error' && 'Failed'}
                            {!syncStatus && 'Send to Watch'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
