import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2 } from 'lucide-react';
import client from '../api/client';

export function SettingsModal({ isOpen, onClose, onSave }) {
    const { t, i18n } = useTranslation();
    const [sport, setSport] = useState("Running");
    const [language, setLanguage] = useState("en");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("Male");
    const [strengthDays, setStrengthDays] = useState(0);
    const [offDays, setOffDays] = useState([]);
    const [metrics, setMetrics] = useState({ threshold_pace: "", ftp: "", max_hr: "", bike_max_power: "", swim_pace_100m: "" });
    const [races, setRaces] = useState([]);
    const [goals, setGoals] = useState({ running: "", triathlon: "", cycling: "" }); // New state for goals
    const [alsoRuns, setAlsoRuns] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        try {
            const res = await client.get('/settings');
            setSport(res.data.primary_sport);
            setLanguage(res.data.language || "en");
            setAge(res.data.age || "");
            setGender(res.data.gender || "Male");
            setStrengthDays(res.data.strength_days || 0);
            setOffDays(res.data.off_days || []);
            setMetrics(res.data.metrics || { threshold_pace: "", ftp: "", max_hr: "", bike_max_power: "", swim_pace_100m: "" });
            setRaces(res.data.races || []);
            setGoals(res.data.goals || { running: "", triathlon: "", cycling: "" });
            setAlsoRuns(res.data.also_runs !== undefined ? res.data.also_runs : true);
        } catch (error) {
            console.error("Failed to load settings", error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await client.post('/settings', {
                primary_sport: sport,
                language: language,
                age: age ? parseInt(age) : null,
                gender: gender,
                strength_days: parseInt(strengthDays),
                off_days: offDays,
                off_days: offDays,
                races: races,
                goals: goals,
                also_runs: sport === "Cycling" ? alsoRuns : true,
            });
            i18n.changeLanguage(language);
            onSave(); // Refresh data
            onClose();
        } catch (error) {
            console.error("Failed to save settings", error);
        } finally {
            setLoading(false);
        }
    };

    const addRace = () => {
        setRaces([...races, { name: '', date: '' }]);
    };

    const updateRace = (index, field, value) => {
        const newRaces = [...races];
        newRaces[index][field] = value;
        setRaces(newRaces);
    };

    const removeRace = (index) => {
        setRaces(races.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4 transition-colors">
            <div className="bg-white dark:bg-garmin-gray w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden transition-colors duration-300">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-transparent shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('coach_settings')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Profile & Strength */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('age')}</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('gender')}</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                            >
                                <option value="Male">{t('male')}</option>
                                <option value="Female">{t('female')}</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('strength_training', { days: strengthDays })}
                        </label>
                        <input
                            type="range"
                            min="0" max="5"
                            value={strengthDays}
                            onChange={(e) => setStrengthDays(e.target.value)}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Off Days Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('off_days')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                <label key={day} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={offDays.includes(day)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setOffDays([...offDays, day]);
                                            } else {
                                                setOffDays(offDays.filter(d => d !== day));
                                            }
                                        }}
                                        className="w-4 h-4 text-garmin-blue bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-garmin-blue"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Training Goals */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('training_goals')}</label>

                        {(sport === "Running" || sport === "Triathlon") && (
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('running_target')}</label>
                                <select
                                    value={goals.running || ""}
                                    onChange={(e) => setGoals({ ...goals, running: e.target.value })}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                                >
                                    <option value="">Select Distance</option>
                                    <option value="5k">5k</option>
                                    <option value="10k">10k</option>
                                    <option value="Half Marathon">Half Marathon</option>
                                    <option value="Marathon">Marathon</option>
                                    <option value="Ultra">Ultra Marathon</option>
                                </select>
                            </div>
                        )}

                        {(sport === "Triathlon") && (
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('triathlon_distance')}</label>
                                <select
                                    value={goals.triathlon || ""}
                                    onChange={(e) => setGoals({ ...goals, triathlon: e.target.value })}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                                >
                                    <option value="">Select Distance</option>
                                    <option value="Sprint">Sprint</option>
                                    <option value="Olympic">Olympic</option>
                                    <option value="70.3">Half Ironman (70.3)</option>
                                    <option value="Full">Ironman (140.6)</option>
                                </select>
                            </div>
                        )}

                        {(sport === "Cycling" || sport === "Triathlon") && (
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('cycling_focus')}</label>
                                <select
                                    value={goals.cycling || ""}
                                    onChange={(e) => setGoals({ ...goals, cycling: e.target.value })}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                                >
                                    <option value="">Select Focus</option>
                                    <option value="General Fitness">General Fitness</option>
                                    <option value="Gran Fondo">Gran Fondo</option>
                                    <option value="Crit Racing">Criterium</option>
                                    <option value="Time Trial">Time Trial</option>
                                    <option value="Climbing">Climbing</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Sport Specific Metrics */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('performance_metrics')}</label>

                        {(sport === "Running" || sport === "Triathlon") && (
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('threshold_pace')}</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 5:00"
                                    value={metrics.threshold_pace || ""}
                                    onChange={(e) => setMetrics({ ...metrics, threshold_pace: e.target.value })}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                                />
                            </div>
                        )}

                        {(sport === "Cycling" || sport === "Triathlon") && (
                            <>
                                <div>
                                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('ftp')}</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 250"
                                        value={metrics.ftp || ""}
                                        onChange={(e) => setMetrics({ ...metrics, ftp: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('max_power')}</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 800"
                                        value={metrics.bike_max_power || ""}
                                        onChange={(e) => setMetrics({ ...metrics, bike_max_power: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                                    />
                                </div>
                            </>
                        )}

                        {(sport === "Swimming" || sport === "Triathlon") && (
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('swim_pace')}</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 1:45"
                                    value={metrics.swim_pace_100m || ""}
                                    onChange={(e) => setMetrics({ ...metrics, swim_pace_100m: e.target.value })}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('max_hr')}</label>
                            <input
                                type="number"
                                placeholder="e.g. 190"
                                value={metrics.max_hr || ""}
                                onChange={(e) => setMetrics({ ...metrics, max_hr: e.target.value })}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                            />
                        </div>
                    </div>

                    {/* Sport Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('primary_sport')}</label>
                        <select
                            value={sport}
                            onChange={(e) => setSport(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-garmin-blue focus:outline-none"
                        >
                            <option value="Running">Running</option>
                            <option value="Cycling">Cycling</option>
                            <option value="Triathlon">Triathlon</option>
                            <option value="Swimming">Swimming</option>
                            <option value="CrossFit">CrossFit</option>
                            <option value="General Fitness">General Fitness</option>
                        </select>

                        {sport === "Cycling" && (
                            <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={alsoRuns}
                                        onChange={(e) => setAlsoRuns(e.target.checked)}
                                        className="w-4 h-4 text-garmin-blue bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-garmin-blue"
                                    />
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100 flex-1">
                                        {t('also_runs')}
                                    </span>
                                </label>
                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 ml-6">
                                    {t('also_runs_desc')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Language Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('language')}</label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-garmin-blue focus:outline-none"
                        >
                            <option value="en">English</option>
                            <option value="tr">Turkish (Türkçe)</option>
                            <option value="de">German (Deutsch)</option>
                            <option value="fr">French (Français)</option>
                            <option value="es">Spanish (Español)</option>
                            <option value="it">Italian (Italiano)</option>
                            <option value="ru">Russian (Русский)</option>
                        </select>
                    </div>

                    {/* Races */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('upcoming_races')}</label>
                            <button
                                onClick={addRace}
                                className="text-xs flex items-center gap-1 text-garmin-blue hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                <Plus size={14} /> {t('add_race')}
                            </button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {races.map((race, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <input
                                        type="text"
                                        placeholder="Race Name"
                                        value={race.name}
                                        onChange={(e) => updateRace(index, 'name', e.target.value)}
                                        className="flex-1 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                                    />
                                    <input
                                        type="date"
                                        value={race.date}
                                        onChange={(e) => updateRace(index, 'date', e.target.value)}
                                        className="w-32 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                                    />
                                    <button
                                        onClick={() => removeRace(index)}
                                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {races.length === 0 && (
                                <p className="text-gray-500 text-sm italic">{t('no_races')}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white font-medium"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 bg-garmin-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium shadow-sm"
                    >
                        {loading ? t('saving') : t('save_settings')}
                    </button>
                </div>
            </div>
        </div>
    );
}
