import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function StatsCard({ title, value, unit, icon: Icon, trend, className, onClick }) {
    return (
        <div
            onClick={onClick}
            className={twMerge(
                "bg-white dark:bg-garmin-gray p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 transition-all duration-300",
                onClick && "cursor-pointer hover:scale-105 hover:shadow-xl hover:border-garmin-blue dark:hover:border-garmin-blue",
                className
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
                        {value} <span className="text-lg text-gray-500 font-normal">{unit}</span>
                    </h3>
                </div>
                {Icon && <Icon className="w-6 h-6 text-garmin-blue" />}
            </div>

            {trend && (
                <div className="flex items-center mt-2">
                    <span className={clsx("text-sm font-medium",
                        trend > 0 ? "text-green-500" : "text-red-500"
                    )}>
                        {trend > 0 ? "+" : ""}{trend}%
                    </span>
                    <span className="text-gray-500 text-xs ml-2">vs last week</span>
                </div>
            )}
        </div>
    );
}
