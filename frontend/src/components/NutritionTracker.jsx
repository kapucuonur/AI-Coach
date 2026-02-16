import { useState } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import client from '../api/client';

export function NutritionTracker() {
    const [uploading, setUploading] = useState(false);
    const [todayData, setTodayData] = useState(null);
    const [showUpload, setShowUpload] = useState(false);

    const handleFileUpload = async (file) => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await client.post('/nutrition/analyze-food', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Refresh today's data
            await loadTodayData();
            setShowUpload(false);

            alert(`Added: ${response.data.food_description}\n${response.data.calories} cal, ${response.data.protein}g protein`);
        } catch (error) {
            console.error('Food analysis failed:', error);
            alert('Failed to analyze food. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const loadTodayData = async () => {
        try {
            const response = await client.get('/nutrition/today');
            setTodayData(response.data);
        } catch (error) {
            console.error('Failed to load nutrition data:', error);
        }
    };

    // Load today's data on mount
    useState(() => {
        loadTodayData();
    }, []);

    return (
        <div className="space-y-4">
            {/* Header with Upload Button */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Today's Nutrition</h3>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                    <Camera size={20} />
                    Log Food
                </button>
            </div>

            {/* Upload Interface */}
            {showUpload && (
                <div className="bg-white dark:bg-garmin-gray p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Upload Food Photo</h4>
                        <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-green-500 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploading ? (
                                <>
                                    <Loader2 className="w-10 h-10 mb-3 text-green-500 animate-spin" />
                                    <p className="text-sm text-gray-500">Analyzing food...</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 mb-3 text-gray-400" />
                                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG or WEBP</p>
                                </>
                            )}
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                            disabled={uploading}
                        />
                    </label>
                </div>
            )}

            {/* Today's Totals */}
            {todayData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-garmin-gray p-4 rounded-xl border border-orange-500/20">
                        <p className="text-xs text-gray-500 uppercase">Calories</p>
                        <p className="text-2xl font-bold text-orange-500">{Math.round(todayData.totals.calories)}</p>
                    </div>
                    <div className="bg-white dark:bg-garmin-gray p-4 rounded-xl border border-red-500/20">
                        <p className="text-xs text-gray-500 uppercase">Protein</p>
                        <p className="text-2xl font-bold text-red-500">{Math.round(todayData.totals.protein)}g</p>
                    </div>
                    <div className="bg-white dark:bg-garmin-gray p-4 rounded-xl border border-blue-500/20">
                        <p className="text-xs text-gray-500 uppercase">Carbs</p>
                        <p className="text-2xl font-bold text-blue-500">{Math.round(todayData.totals.carbs)}g</p>
                    </div>
                    <div className="bg-white dark:bg-garmin-gray p-4 rounded-xl border border-yellow-500/20">
                        <p className="text-xs text-gray-500 uppercase">Fats</p>
                        <p className="text-2xl font-bold text-yellow-500">{Math.round(todayData.totals.fats)}g</p>
                    </div>
                </div>
            )}

            {/* Today's Meals */}
            {todayData?.entries && todayData.entries.length > 0 && (
                <div className="bg-white dark:bg-garmin-gray rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Today's Meals</h4>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                        {todayData.entries.map((entry) => (
                            <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{entry.food_description}</p>
                                        <p className="text-sm text-gray-500">{new Date(entry.meal_time).toLocaleTimeString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-orange-500">{Math.round(entry.calories)} cal</p>
                                        <p className="text-xs text-gray-500">
                                            P: {entry.protein}g • C: {entry.carbs}g • F: {entry.fats}g
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
