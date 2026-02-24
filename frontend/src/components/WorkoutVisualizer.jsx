import React from 'react';

const WorkoutVisualizer = ({ workout }) => {
    if (!workout) return null;

    // Extract steps from the nested Garmin structure
    const steps = workout.steps || (workout.workoutSegments && workout.workoutSegments.flatMap(segment => segment.workoutSteps)) || [];

    if (steps.length === 0) return null;

    // Helper to format duration/distance based on Garmin's endCondition block
    const formatCondition = (step) => {
        const endCond = step.endCondition?.conditionTypeKey;
        const endVal = step.endConditionValue;

        if (endCond === 'time' && endVal) {
            const mins = Math.floor(endVal / 60);
            const secs = Math.round(endVal % 60);
            if (secs === 0) return `${mins} min`;
            return `${mins}:${secs.toString().padStart(2, '0')} min`;
        }
        if (endCond === 'distance' && endVal) {
            if (endVal >= 1000) {
                // Return exactly 1 decimal only if needed
                const km = endVal / 1000;
                return `${Number.isInteger(km) ? km : km.toFixed(2)} km`;
            }
            return `${endVal} m`;
        }
        if (endCond === 'lap.button') {
            return 'Lap Button';
        }
        return endVal ? `${endVal}` : '';
    };

    // Helper to format targets (like HR zones, Power zones)
    const formatTarget = (step) => {
        if (!step.targetType || step.targetType.workoutTargetTypeKey === 'no.target') return null;

        const key = step.targetType.workoutTargetTypeKey;
        const val1 = step.targetValueOne;
        const val2 = step.targetValueTwo;

        if (key === 'heart.rate.zone') {
            return `HR Zone ${val1}` + (val2 && val2 !== val1 ? `-${val2}` : '');
        }
        if (key === 'pace.zone') {
            if (val1 && typeof val1 === 'number' && val1 > 10) {
                // if raw seconds per km instead of zone
                return `PaceTarget`;
            }
            return `Pace Zone ${val1}` + (val2 && val2 !== val1 ? `-${val2}` : '');
        }
        if (key === 'power.zone') {
            if (val1 && typeof val1 === 'number' && val1 > 10) {
                // raw watts
                return `${val1}-${val2 || val1} W`;
            }
            return `Power Zone ${val1}` + (val2 && val2 !== val1 ? `-${val2}` : '');
        }
        return key.replace('.zone', '');
    };

    // Group the steps logically to match the Pro Training Plan layout
    const groupedSteps = (() => {
        const warmup = [];
        const main = [];
        const cooldown = [];

        steps.forEach(step => {
            const type = step.stepType?.stepTypeKey;
            const desc = step.description?.toLowerCase() || '';

            if (type === 'warmup' || desc.includes('warm')) {
                warmup.push(step);
            } else if (type === 'cooldown' || desc.includes('cool')) {
                cooldown.push(step);
            } else {
                main.push(step);
            }
        });

        return { warmup, main, cooldown };
    })();

    return (
        <div className="mt-6 mb-4 p-5 bg-white dark:bg-zinc-950 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5 uppercase tracking-wider flex items-center justify-between">
                <span>Workout Structure</span>
            </h3>

            <div className="space-y-3 relative z-10 w-full">

                {/* WARM UP Phase */}
                {groupedSteps.warmup.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm w-full">
                        <div className="w-full sm:w-20 shrink-0 font-bold text-gray-400 uppercase sm:text-right text-xs">Warm Up</div>
                        <div className="flex-1 w-full bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-400 px-4 py-3 sm:py-2.5 rounded-xl border border-yellow-200/50 dark:border-yellow-900/20 flex flex-col sm:flex-row justify-between gap-2 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="font-medium">{groupedSteps.warmup[0].description || "Warm Up"}</span>
                                {formatTarget(groupedSteps.warmup[0]) && (
                                    <span className="text-xs opacity-70 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full inline-block w-fit">
                                        {formatTarget(groupedSteps.warmup[0])}
                                    </span>
                                )}
                            </div>
                            <span className="font-mono opacity-80 text-xs self-start sm:self-auto bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded">
                                {groupedSteps.warmup.map(s => formatCondition(s)).join(' + ')}
                            </span>
                        </div>
                    </div>
                )}

                {/* MAIN SET Phase */}
                {groupedSteps.main.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 text-sm w-full my-4">
                        <div className="w-full sm:w-20 shrink-0 font-bold text-garmin-blue uppercase sm:text-right text-xs pt-1 sm:pt-3">Main Set</div>
                        <div className="flex-1 w-full space-y-2">
                            {groupedSteps.main.map((step, sIdx) => {
                                const isRest = step.stepType?.stepTypeKey === 'rest' || step.stepType?.stepTypeKey === 'recovery';
                                const target = formatTarget(step);

                                return (
                                    <div key={sIdx} className={`px-4 py-3 sm:py-2.5 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-2 shadow-sm transition-colors hover:border-gray-300 dark:hover:border-gray-600
                                        ${isRest
                                            ? 'bg-gray-50 dark:bg-zinc-900/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/5 border-dashed'
                                            : 'bg-white dark:bg-zinc-800/50 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-white/10'
                                        }`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                                            <span className="font-medium tracking-tight">
                                                {step.description || (isRest ? "Recovery" : "Active Effort")}
                                            </span>
                                            {target && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full inline-block w-fit ${isRest ? 'bg-black/5 dark:bg-white/5 opacity-70' : 'bg-garmin-blue/10 text-garmin-blue dark:bg-garmin-blue/20 dark:text-blue-300'}`}>
                                                    🎯 {target}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 font-mono text-xs opacity-90 sm:text-right mt-1 sm:mt-0 items-center">
                                            <span className={`${isRest ? 'opacity-80' : 'font-semibold'}`}>⏱ {formatCondition(step)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* COOL DOWN Phase */}
                {groupedSteps.cooldown.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm w-full">
                        <div className="w-full sm:w-20 shrink-0 font-bold text-gray-400 uppercase sm:text-right text-xs">Cool Down</div>
                        <div className="flex-1 w-full bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 px-4 py-3 sm:py-2.5 rounded-xl border border-blue-200/50 dark:border-blue-900/20 flex flex-col sm:flex-row justify-between gap-2 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="font-medium">{groupedSteps.cooldown[0].description || "Cool Down"}</span>
                                {formatTarget(groupedSteps.cooldown[0]) && (
                                    <span className="text-xs opacity-70 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full inline-block w-fit">
                                        {formatTarget(groupedSteps.cooldown[0])}
                                    </span>
                                )}
                            </div>
                            <span className="font-mono opacity-80 text-xs self-start sm:self-auto bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded">
                                {groupedSteps.cooldown.map(s => formatCondition(s)).join(' + ')}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Background absolute styling layer to give premium touch */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-garmin-blue/5 rounded-full blur-3xl pointer-events-none transform translate-x-10 -translate-y-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl pointer-events-none transform -translate-x-10 translate-y-10"></div>
        </div>
    );
};

export default WorkoutVisualizer;
