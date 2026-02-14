
import React from 'react'

const MetricsDisplay = ({ power, cadence, speed, heartRate }) => (
    <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
            <div className="text-3xl font-bold text-yellow-400">{power || 0}</div>
            <div className="text-sm text-gray-400">Watt</div>
        </div>
        <div className="metric-card">
            <div className="text-3xl font-bold text-green-400">{cadence || 0}</div>
            <div className="text-sm text-gray-400">RPM</div>
        </div>
        <div className="metric-card">
            <div className="text-3xl font-bold text-blue-400">{(speed || 0).toFixed(1)}</div>
            <div className="text-sm text-gray-400">km/h</div>
        </div>
        <div className="metric-card">
            <div className="text-3xl font-bold text-red-400">{heartRate || '--'}</div>
            <div className="text-sm text-gray-400">Nabız</div>
        </div>
    </div>
)

export default MetricsDisplay
