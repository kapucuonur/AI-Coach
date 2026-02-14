
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../components/Navbar.jsx'
import Cesium3DMap from '../components/Map/Cesium3DMap.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const FreeRideSetup = () => {
    const [selectedLocation, setSelectedLocation] = useState(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleMapClick = (coords) => {
        setSelectedLocation(coords)
    }

    const handleStartRide = async () => {
        if (!selectedLocation) return
        setLoading(true)

        try {
            const token = localStorage.getItem('token')
            // Backend endpoint to generate a synthetic route starting at selected coords
            const response = await axios.post(`${API_URL}/routes/free-ride`, null, {
                params: {
                    lat: selectedLocation.lat,
                    lng: selectedLocation.lng
                },
                headers: { Authorization: `Bearer ${token}` }
            })

            const route = response.data
            navigate(`/ride/${route.id}`)
        } catch (error) {
            console.error('Özgür sürüş başlatılamadı:', error)
            alert('Sürüş başlatılamadı. Lütfen tekrar deneyin.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            <Navbar />

            <div className="flex-grow relative">
                <Cesium3DMap
                    colors={[]}
                    coordinates={[]} // Empty array to show global map
                    onClick={handleMapClick}
                />

                {/* Overlay Panel */}
                <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 p-6 rounded-xl shadow-2xl border border-blue-500/30 max-w-sm">
                    <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <span>🗺️</span> Özgür Sürüş
                    </h1>
                    <p className="text-gray-300 mb-6 text-sm">
                        Dünya haritası üzerinde sürmek istediğiniz herhangi bir noktayı seçin.
                        Sizin için otomatik olarak 20 km'lik bir rota oluşturacağız.
                    </p>

                    {selectedLocation ? (
                        <div className="space-y-4">
                            <div className="bg-gray-700 p-3 rounded text-sm">
                                <div className="text-gray-400">Seçilen Konum</div>
                                <div className="font-mono text-green-400">
                                    {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                                </div>
                            </div>

                            <button
                                onClick={handleStartRide}
                                disabled={loading}
                                className="w-full btn-primary py-3 text-lg shadow-lg shadow-blue-600/20"
                            >
                                {loading ? 'Rota Oluşturuluyor...' : 'Sürüşü Başlat 🚴‍♂️'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-4 bg-blue-900/30 rounded border border-blue-500/30 animate-pulse">
                            📍 Lütfen haritadan bir yer seçin
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FreeRideSetup
