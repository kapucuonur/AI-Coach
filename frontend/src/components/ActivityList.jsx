import React from 'react';
import { Activity, Bike, Footprints, Waves } from 'lucide-react';

const ActivityIcon = ({ type }) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('running')) return <Footprints className="w-5 h-5 text-orange-400" />;
    if (t.includes('cycling')) return <Bike className="w-5 h-5 text-blue-400" />;
    if (t.includes('swimming')) return <Waves className="w-5 h-5 text-cyan-400" />;
    return <Activity className="w-5 h-5 text-gray-400" />;
};

export function ActivityList({ activities, onSelect }) {
    if (!activities || activities.length === 0) return <div className="text-gray-500">No recent activities.</div>;

    return (
        <div className="bg-white dark:bg-garmin-gray rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-300 shadow-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activities</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {activities.map((act) => (
                    <div
                        key={act.activityId}
                        onClick={() => onSelect && onSelect(act.activityId)}
                        className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                                <ActivityIcon type={act.activityType.typeKey} />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{act.activityName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(act.startTimeLocal).toLocaleDateString()} • {new Date(act.startTimeLocal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white">{(act.distance / 1000).toFixed(2)} km</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{(act.duration / 60).toFixed(0)} min</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
