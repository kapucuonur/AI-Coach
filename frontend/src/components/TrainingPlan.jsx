import { useState } from 'react';
import { Calendar, ChevronRight, Activity, Clock, Zap } from 'lucide-react';
import client from '../api/client';

export function TrainingPlan({ userContext, language }) {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Simple translations
    const t = {
        en: {
            title: "Training Plan",
            desc: "Generate a structured plan tailored to your goals.",
            gen1w: "Generate 1-Week Plan",
            gen1m: "Generate 1-Month Plan",
            generating: "Designing your plan...",
            error: "Failed to generate plan. Please try again."
        },
        tr: {
            title: "Antrenman Programı",
            desc: "Hedeflerinize özel yapılandırılmış bir program oluşturun.",
            gen1w: "1 Haftalık Program Oluştur",
            gen1m: "1 Aylık Program Oluştur",
            generating: "Programınız tasarlanıyor...",
            error: "Program oluşturulamadı. Lütfen tekrar deneyin."
        },
        // Add others as needed, default to EN
    };

    const txt = t[language] || t['en'];

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
            setError(txt.error);
        } finally {
            setLoading(false);
        }
    };

    if (!plan && !loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{txt.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{txt.desc}</p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => handleGenerate("1-Week")}
                        className="flex-1 py-3 px-4 bg-garmin-blue hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Calendar size={18} />
                        {txt.gen1w}
                    </button>
                    <button
                        onClick={() => handleGenerate("1-Month")}
                        className="flex-1 py-3 px-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Calendar size={18} />
                        {txt.gen1m}
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
                <p className="text-gray-500 dark:text-gray-400 animate-pulse">{txt.generating}</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{plan.summary}</p>
                </div>
                <button
                    onClick={() => setPlan(null)}
                    className="text-sm text-garmin-blue hover:underline"
                >
                    Reset
                </button>
            </div>

            <div className="space-y-6">
                {plan.weeks.map((week) => (
                    <div key={week.week_number} className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                            Week {week.week_number} • {week.focus}
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                            {week.days.map((day, idx) => (
                                <div key={idx} className="flex gap-4 p-3 rounded-xl bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-gray-800/50 hover:border-garmin-blue/30 transition-colors">
                                    {/* Date/Day Box */}
                                    <div className="min-w-[4rem] flex flex-col items-center justify-center p-2 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-gray-800">
                                        <span className="text-xs text-gray-500 font-medium">{day.day_name.substring(0, 3)}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <h5 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                {day.activity_type === 'Rest' ? (
                                                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                                ) : (
                                                    <Activity size={14} className="text-garmin-blue" />
                                                )}
                                                {day.workout_title}
                                            </h5>
                                            {day.duration && (
                                                <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded-full flex items-center gap-1">
                                                    <Clock size={10} /> {day.duration}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {day.description}
                                        </p>
                                        {day.intensity && (
                                            <div className="mt-2 flex items-center gap-1 text-xs text-orange-500">
                                                <Zap size={10} />
                                                <span>Intensity: {day.intensity}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
