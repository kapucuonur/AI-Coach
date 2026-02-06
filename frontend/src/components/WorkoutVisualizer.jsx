import React from 'react';

const WorkoutVisualizer = ({ workout }) => {
    if (!workout || !workout.steps) return null;

    // Calculate total duration to determine width percentages
    const totalDuration = workout.steps.reduce((acc, step) => {
        // Assuming endConditionValue is in seconds for time-based steps
        // For distance based, we might need an estimated duration or just use relative width
        return acc + (step.endConditionValue || 300); // Default to 5 mins if unknown
    }, 0);

    const getStepColor = (stepType, description) => {
        const type = stepType?.stepTypeKey || '';
        const desc = description?.toLowerCase() || '';

        if (type === 'warmup' || desc.includes('warm')) return 'bg-blue-400 dark:bg-blue-500';
        if (type === 'cooldown' || desc.includes('cool')) return 'bg-teal-400 dark:bg-teal-500';
        if (type === 'recovery' || type === 'rest' || desc.includes('rest') || desc.includes('recover')) return 'bg-green-400 dark:bg-green-500';
        if (type === 'interval' || desc.includes('run') || desc.includes('fast') || desc.includes('hard')) return 'bg-orange-500 dark:bg-orange-600';

        return 'bg-gray-400';
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };

    return (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Workout Structure
            </h3>

            {/* Visual Bar */}
            <div className="flex w-full h-12 rounded-lg overflow-hidden shadow-sm">
                {workout.steps.map((step, index) => {
                    const duration = step.endConditionValue || 300;
                    const widthPct = (duration / totalDuration) * 100;

                    return (
                        <div
                            key={index}
                            className={`${getStepColor(step.stepType, step.description)} h-full relative group transition-all hover:brightness-110`}
                            style={{ width: `${widthPct}%` }}
                        >
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-900 text-white text-xs p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                <div className="font-bold">{step.description || step.stepType?.stepTypeKey}</div>
                                <div>Duration: {formatTime(duration)}</div>
                                {step.targetValueOne && (
                                    <div>Target: {step.targetValueOne} {step.targetValueTwo ? `- ${step.targetValueTwo}` : ''}</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend / Key Details */}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-400 dark:bg-blue-500"></div> Warmup
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-orange-500 dark:bg-orange-600"></div> Work
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-400 dark:bg-green-500"></div> Recovery
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-teal-400 dark:bg-teal-500"></div> Cooldown
                </div>
            </div>
        </div>
    );
};

export default WorkoutVisualizer;
