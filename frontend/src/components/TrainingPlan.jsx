import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronRight, Activity, Clock, Zap } from 'lucide-react';
import client from '../api/client';

export function TrainingPlan({ userContext, language }) {
    const { t } = useTranslation();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = async (duration) => {
        setLoading(true);
        setError(null);
        try {
            // In a real app we might pass email/password or use a token. 
            // For now we assume the backend handles auth or we reuse credentials if stored/passed.
            // Since our backend plan endpoint expects body with email/pass, we might need those from parent or context.
            // However, client.post handles session/cookies usually? 
            // Wait, our backend endpoint `PlanRequest` asks for email/password. 
            // The frontend `client` usually just sends requests. 
            // IF we are using the simple auth from `Login.jsx` where we don't store a token but just rely on 
            // the temporary session in backend... actually `garmin_client.py` uses a persisted session now!
            // So we might technically just need to trigger it. 
            // BUT `PlanRequest` model DOES require check. 
            // Let's UPDATE the backend router to make those optional if session exists? 
            // Or we can just pass dummy values if the backend `GarminClient` can reuse the session session file.
            // Let's try passing the email at least if we have it? 
            // Actually `Login.jsx` didn't save creds in a global context accessible here easily without passing it down.
            // Let's assume for this "Stateless" demo we might need to pass creds. 
            // OR better, we update the backend to rely on the *server-side* session if available?
            // Given the constraints, let's just assume we pass the `userContext` or similar if it had auth info.
            // Wait, `App.jsx` `handleLogin` receives `credentials`. We should probably save them in state there and pass down.

            // FOR NOW: We will assume we can pass the email/pass if we had them.
            // Since I don't want to refactor `App.jsx` to store passwords (bad practice), 
            // I will rely on the fact that `GarminClient` executes a login. 
            // If we don't have pass, maybe we fail? 
            // Let's see... `GarminClient` needs them. 
            // Okay, strictly speaking, to generate a plan we need to fetch fresh data.
            // Let's rely on the `client` sending what it can. 
            // Actually, let's just mock the credentials as "stored_session" if `garmin_client` supports it?
            // No, `PlanRequest` is strict. 

            // FIX: I will update `App.jsx` to store `credentials` (in memory) and pass to `TrainingPlan`.

            const payload = {
                email: userContext.credentials?.email,
                password: userContext.credentials?.password,
                duration: duration,
                language: language // Pass language to backend if needed? Backend gets it from settings DB, so fine.
            };

            const res = await client.post('/plan/generate', payload);
            setPlan(res.data);
        } catch (err) {
            console.error(err);
            setError(t('error'));
        } finally {
            setLoading(false);
        }
    };

    if (!plan && !loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('training_plan_title')}</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{t('training_plan_desc')}</p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => handleGenerate("1-Week")}
                        className="flex-1 py-3 px-4 bg-garmin-blue hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Calendar size={18} />
                        {t('generate_1w')}
                    </button>
                    <button
                        onClick={() => handleGenerate("1-Month")}
                        className="flex-1 py-3 px-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Calendar size={18} />
                        {t('generate_1m')}
                    </button>
                </div>
                {error && <p className="text-red-500 mt-4 text-sm text-center">{error}</p>}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-garmin-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t('generating')}</p>
            </div>
        );
    }

    const getActivityTheme = (type, title) => {
        const t = (type || "").toLowerCase();
        const ti = (title || "").toLowerCase();

        if (t === 'swim' || ti.includes('swim')) return { color: 'blue', icon: '🏊', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200 dark:border-blue-900', light: 'bg-blue-50 dark:bg-blue-900/20' };
        if (t === 'bike' || t === 'cycle' || ti.includes('ride') || ti.includes('cycle')) return { color: 'orange', icon: '🚴', bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-200 dark:border-orange-900', light: 'bg-orange-50 dark:bg-orange-900/20' };
        if (t === 'run' || ti.includes('run')) return { color: 'emerald', icon: '🏃', bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200 dark:border-emerald-900', light: 'bg-emerald-50 dark:bg-emerald-900/20' };
        if (t === 'strength' || ti.includes('gym') | ti.includes('lift')) return { color: 'purple', icon: '🏋️', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-200 dark:border-purple-900', light: 'bg-purple-50 dark:bg-purple-900/20' };

        return { color: 'gray', icon: '⚡', bg: 'bg-gray-500', text: 'text-gray-500', border: 'border-gray-200 dark:border-gray-800', light: 'bg-gray-50 dark:bg-zinc-800' };
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-0 shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-white/5">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        📅 {plan.title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{plan.summary}</p>
                </div>
                <button onClick={() => setPlan(null)} className="text-xs font-medium text-red-500 hover:text-red-400 uppercase tracking-wide px-3 py-1 rounded-full border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    {t('reset_plan')}
                </button>
            </div>

            <div className="p-6 space-y-12">
                {plan.weeks.map((week) => (
                    <div key={week.week_number} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">
                                {t('week')} {week.week_number} <span className="text-garmin-blue mx-2">•</span> {week.focus}
                            </h4>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                            {week.days.map((day, idx) => {
                                const isRest = day.activity_type === 'Rest';
                                const theme = getActivityTheme(day.activity_type, day.workout_title);

                                return (
                                    <div key={idx} className={`relative flex flex-col md:flex-row gap-0 rounded-2xl border transition-all hover:shadow-md ${isRest ? 'bg-gray-50/50 dark:bg-zinc-900/30 border-dashed border-gray-300 dark:border-gray-700 opacity-80' : `bg-white dark:bg-zinc-950/80 ${theme.border} border-l-4 border-l-${theme.color}-500`}`}>

                                        {/* Day Info Column */}
                                        <div className="p-4 md:w-32 flex md:flex-col items-center md:items-start justify-between md:justify-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-white/5">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t(day.day_name.toLowerCase())}</span>
                                            <div className="text-2xl mt-1">{isRest ? '😴' : theme.icon}</div>
                                            {day.total_duration && (
                                                <span className="hidden md:inline-block text-xs font-mono text-gray-500 mt-2 bg-white dark:bg-black/20 px-1.5 py-0.5 rounded">
                                                    {day.total_duration}
                                                </span>
                                            )}
                                        </div>

                                        {/* Main Content */}
                                        <div className="p-4 flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className={`font-bold text-lg ${isRest ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                                    {day.workout_title}
                                                </h5>
                                                {day.total_duration && <span className="md:hidden text-xs font-mono text-gray-500">{day.total_duration}</span>}
                                            </div>

                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{day.overview || day.description}</p>

                                            {/* Structured Steps Visuals */}
                                            {day.structure && (
                                                <div className="space-y-2">
                                                    {/* Warmup */}
                                                    {day.structure.warmup && (
                                                        <div className="flex items-center gap-3 text-xs">
                                                            <div className="w-16 shrink-0 font-bold text-gray-400 uppercase text-right">Warm Up</div>
                                                            <div className="flex-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 px-3 py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-900/30 flex justify-between">
                                                                <span>{day.structure.warmup.description}</span>
                                                                <span className="font-mono opacity-80">{day.structure.warmup.duration}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Main Set */}
                                                    {day.structure.main_set && day.structure.main_set.length > 0 && (
                                                        <div className="flex items-start gap-3 text-xs">
                                                            <div className="w-16 shrink-0 font-bold text-garmin-blue uppercase text-right pt-2">Main Set</div>
                                                            <div className="flex-1 space-y-1">
                                                                {day.structure.main_set.map((step, sIdx) => (
                                                                    <div key={sIdx} className={`px-3 py-2 rounded-lg border flex justify-between items-center ${theme.light} ${theme.text} ${theme.border}`}>
                                                                        <span className="font-medium">
                                                                            {step.repeats > 1 && <span className="bg-white dark:bg-black/20 px-1.5 rounded text-[10px] mr-2 border border-current opacity-70">{step.repeats}x</span>}
                                                                            {step.description}
                                                                        </span>
                                                                        <div className="flex gap-2 font-mono text-[10px] opacity-90">
                                                                            <span>{step.duration}</span>
                                                                            {step.target && <span className="hidden sm:inline">• {step.target}</span>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Cooldown */}
                                                    {day.structure.cooldown && (
                                                        <div className="flex items-center gap-3 text-xs">
                                                            <div className="w-16 shrink-0 font-bold text-gray-400 uppercase text-right">Cool Down</div>
                                                            <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/20 flex justify-between">
                                                                <span>{day.structure.cooldown.description}</span>
                                                                <span className="font-mono opacity-80">{day.structure.cooldown.duration}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
