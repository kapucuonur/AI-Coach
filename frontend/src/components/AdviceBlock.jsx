import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Sparkles, Watch, CheckCircle, AlertCircle, ChevronDown, Volume2, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import client from '../api/client';
import WorkoutVisualizer from './WorkoutVisualizer';

export function AdviceBlock({ advice, workout, isGenerating }) {
    const { t, i18n } = useTranslation();
    const [syncStatus, setSyncStatus] = useState(null); // 'loading', 'success', 'error'
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [fetchingDevices, setFetchingDevices] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const toggleSpeech = () => {
        if (!window.speechSynthesis) return;

        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        } else {
            if (!advice) return;

            const textToSpeak = advice
                .replace(/(\*\*|__)(.*?)\1/g, '$2')
                .replace(/(\*|_)(.*?)\1/g, '$2')
                .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                .replace(/[#*>]/g, '')
                .replace(/[\n\r]+/g, '. ');

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            const targetLang = i18n.language || navigator.language || 'en-US';
            utterance.lang = targetLang;

            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const langPrefix = targetLang.split('-')[0];
                let preferredVoices = voices.filter(v =>
                    v.lang.startsWith(langPrefix) &&
                    (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Enhanced') ||
                        v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Tessa') || v.name.includes('Karen') || v.name.includes('Yelda'))
                );

                if (preferredVoices.length === 0) {
                    preferredVoices = voices.filter(v => v.lang.startsWith(langPrefix));
                }

                // For Turkish, "Yelda" (macOS) or "Google Türkçe" are typical better choices. Avoid Yelda's default robotic speed.
                let bestVoice = preferredVoices.find(v => v.name.includes('Female')) ||
                    preferredVoices.find(v => v.name.includes('Google')) ||
                    preferredVoices.find(v => v.name.includes('Yelda')) ||
                    preferredVoices.find(v => v.name.includes('Samantha') || v.name.includes('Tessa')) ||
                    preferredVoices[0];

                if (bestVoice) {
                    utterance.voice = bestVoice;
                }
            }

            // Turkish default voices sound notoriously bad when sped up. Keep Turkish closer to normal rate.
            if (targetLang.startsWith('tr')) {
                utterance.pitch = 1.0;
                utterance.rate = 0.95; // Slightly slower makes Turkish robot voices more comprehensible
            } else {
                utterance.pitch = 1.1;
                utterance.rate = 1.05;
            }

            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = () => setIsPlaying(false);

            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
        }
    };

    useEffect(() => {
        if (workout) {
            const fetchDevices = async () => {
                setFetchingDevices(true);
                try {
                    const response = await client.get('/garmin/devices');
                    const sorted = response.data.sort((a, b) => {
                        // basic sort to put connected/primary first
                        if (a.connectionStatus === 'CONNECTED' && b.connectionStatus !== 'CONNECTED') return -1;
                        if (a.primary && !b.primary) return -1;
                        return 0;
                    });
                    setDevices(sorted);
                    if (sorted.length > 0) {
                        setSelectedDeviceId(sorted[0].deviceId);
                    }
                } catch (err) {
                    console.error('Failed to fetch devices:', err);
                } finally {
                    setFetchingDevices(false);
                }
            };
            fetchDevices();
        }
    }, [workout]);

    const handleSync = async () => {
        if (!workout) return;
        setSyncStatus('loading');
        try {
            await client.post('/coach/sync', {
                workout,
                deviceId: selectedDeviceId || null
            });
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
        const adviceStr = (advice || "").toLowerCase();
        if (type === 'running' || adviceStr.includes('run')) return <div className="text-2xl">🏃</div>;
        if (type === 'cycling' || adviceStr.includes('ride') || adviceStr.includes('cycle')) return <div className="text-2xl">🚴</div>;
        if (type === 'swimming' || adviceStr.includes('swim')) return <div className="text-2xl">🏊</div>;
        if (type === 'strength_training' || adviceStr.includes('gym') || adviceStr.includes('lift')) return <div className="text-2xl">🏋️</div>;
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
                <div className="flex items-center gap-3">
                    {advice && !isGenerating && (
                        <button
                            onClick={toggleSpeech}
                            className={`p-2 rounded-full transition-all duration-300 ${isPlaying ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                            title={isPlaying ? "Stop listening" : "Listen to advice"}
                            aria-label="Listen to advice"
                        >
                            {isPlaying ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} />}
                        </button>
                    )}
                    <div className="opacity-80">
                        {getSportIcon()}
                    </div>
                </div>
            </div>

            <div className="p-6 relative z-10">
                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center animate-pulse">
                        <div className="w-10 h-10 border-4 border-garmin-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">AI Coach is analyzing your recovery and generating your daily plan...</p>
                    </div>
                ) : (
                    <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 font-sans leading-relaxed mb-6 dark:prose-invert">
                        <ReactMarkdown>{advice || "No advice generated yet."}</ReactMarkdown>
                    </div>
                )}

                {/* Visual Workout Builder */}
                {workout && <WorkoutVisualizer workout={workout} />}

                {/* Device Selector and Send to Watch Button */}
                <div className="flex flex-col sm:flex-row justify-end items-center gap-3 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 relative">
                    {devices.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedDeviceId}
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                                className="appearance-none bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-garmin-blue font-medium w-full sm:w-auto"
                                disabled={!workout}
                                title={!workout ? "No workout available" : ""}
                            >
                                {devices.map(d => (
                                    <option key={d.deviceId} value={d.deviceId}>
                                        {d.productDisplayName || d.modelName || 'Garmin Device'} {d.connectionStatus === 'CONNECTED' ? ' (Online)' : ''}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                    )}

                    <button
                        onClick={handleSync}
                        disabled={!workout || syncStatus === 'loading' || syncStatus === 'success' || fetchingDevices}
                        title={!workout ? "No workout generated to send" : ""}
                        className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-medium transition-all w-full sm:w-auto ${!workout
                            ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed'
                            : syncStatus === 'success'
                                ? 'bg-green-500/20 text-green-500 dark:text-green-400'
                                : syncStatus === 'error'
                                    ? 'bg-red-500/20 text-red-500 dark:text-red-400'
                                    : 'bg-garmin-blue text-white hover:bg-blue-600 shadow-sm hover:shadow'
                            }`}
                    >
                        {syncStatus === 'loading' && <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />}
                        {syncStatus === 'success' && <CheckCircle size={18} />}
                        {syncStatus === 'error' && <AlertCircle size={18} />}

                        {!syncStatus && <Watch size={18} />}

                        {syncStatus === 'loading' && t('sending')}
                        {syncStatus === 'success' && t('sent_to_watch')}
                        {syncStatus === 'error' && t('failed')}
                        {!syncStatus && (t('send_to_watch') || "Send to Watch")}
                    </button>
                </div>
            </div>
        </div>
    );
}
