
import React from 'react'

const GradientIndicator = ({ gradient, upcoming }) => {
    const getColor = (g) => {
        if (g > 10) return '#DC2626'
        if (g > 5) return '#EA580C'
        if (g > 2) return '#EAB308'
        if (g > -2) return '#16A34A'
        if (g > -5) return '#0891B2'
        return '#2563EB'
    }

    const getIcon = (g) => {
        if (g > 3) return '▲▲▲'
        if (g > 1) return '▲'
        if (g < -3) return '▼▼▼'
        if (g < -1) return '▼'
        return '▬'
    }

    return (
        <div
            className="rounded-xl p-6 text-center transition-all duration-500"
            style={{ backgroundColor: getColor(gradient) }}
        >
            <div className="text-6xl mb-2">{getIcon(gradient)}</div>
            <div className="text-4xl font-bold mb-1">%{gradient.toFixed(1)}</div>
            {upcoming && Math.abs(upcoming - gradient) > 1 && (
                <div className="mt-2 text-sm opacity-90">Yakında: %{upcoming.toFixed(1)}</div>
            )}
        </div>
    )
}

export default GradientIndicator
