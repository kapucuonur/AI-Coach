
import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVirtualRide } from '../hooks/useVirtualRide.js'
import { useWebBluetooth } from '../hooks/useWebBluetooth.js'
import Navbar from '../components/Navbar.jsx'
import BluetoothButton from '../components/Trainer/BluetoothButton.jsx'
import MetricsDisplay from '../components/Trainer/MetricsDisplay.jsx'
import GradientIndicator from '../components/Trainer/GradientIndicator.jsx'
import Cesium3DMap from '../components/Map/Cesium3DMap.jsx'

const VirtualRide = () => {
    const { routeId } = useParams()
    const navigate = useNavigate()

    const {
        status,
        rideData,
        startRide,
        finishRide
    } = useVirtualRide(routeId)

    const {
        scanAndConnect,
        disconnect,
        connected,
        metrics
    } = useWebBluetooth()

    const handleFinish = async () => {
        if (confirm('Sürüşü bitirmek istediğinize emin misiniz?')) {
            await finishRide()
            navigate('/activities')
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            <Navbar />

            <div className="container mx-auto px-4 py-6 flex-grow flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <BluetoothButton
                        onClick={connected ? disconnect : scanAndConnect}
                        connected={connected}
                    />

                    <div className="space-x-4">
                        {status === 'idle' && (
                            <button onClick={startRide} className="btn-primary text-lg px-8">
                                BAŞLAT
                            </button>
                        )}
                        {status === 'active' && (
                            <button onClick={handleFinish} className="btn-danger">
                                Bitir
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
                    {/* Sol Panel: Metrikler ve Harita */}
                    <div className="lg:col-span-2 space-y-6">
                        <MetricsDisplay
                            power={metrics.power}
                            cadence={metrics.cadence}
                            speed={metrics.speed}
                            heartRate={metrics.heartRate}
                        />

                        <div className="bg-gray-800 rounded-lg p-4 h-96">
                            {/* Cesium Haritası Buraya Gelecek - Şimdilik Placeholder */}
                            <div className="h-full w-full bg-black rounded-lg flex items-center justify-center text-gray-500">
                                3D Harita Yükleniyor...
                            </div>
                        </div>
                    </div>

                    {/* Sağ Panel: Eğim ve Bilgi */}
                    <div className="space-y-6">
                        <GradientIndicator
                            gradient={rideData.gradient}
                            upcoming={rideData.upcoming?.future_gradient}
                        />

                        <div className="bg-gray-800 rounded-lg p-6">
                            <h3 className="text-xl font-bold mb-4">Sürüş İstatistikleri</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Mesafe</span>
                                    <span className="font-bold">{(rideData.distance / 1000).toFixed(2)} km</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Yükseklik</span>
                                    <span className="font-bold">{Math.round(rideData.elevation)} m</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">İlerleme</span>
                                    <span className="font-bold">%{rideData.progress.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default VirtualRide
