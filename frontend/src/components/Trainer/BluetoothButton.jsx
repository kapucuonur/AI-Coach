
import React from 'react'

const BluetoothButton = ({ onClick, connected }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg font-semibold ${connected ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
    >
        {connected ? '✅ Bağlı' : '🔵 Trainer Bağla'}
    </button>
)

export default BluetoothButton
