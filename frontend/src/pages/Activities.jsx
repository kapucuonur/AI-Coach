
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const Activities = () => {
    const [activities, setActivities] = useState([])


    const [syncing, setSyncing] = useState(false)

    const fetchActivities = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`${API_URL}/activities`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setActivities(response.data)
        } catch (error) {
            console.error('Hata:', error)
        }
    }

    useEffect(() => {
        fetchActivities()
    }, [])

    const handleSync = async () => {
        setSyncing(true)
        try {
            const token = localStorage.getItem('token')
            // Default to using server-side env creds by sending empty object
            const response = await axios.post(`${API_URL}/activities/sync/garmin`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            alert(response.data.message || 'Senkronizasyon başarılı!')
            fetchActivities() // Refresh list
        } catch (error) {
            console.error('Sync Error:', error)
            alert('Senkronizasyon hatası: ' + (error.response?.data?.detail || error.message))
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Geçmiş Aktiviteler</h1>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${syncing
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 hover:scale-105'
                            }`}
                    >
                        {syncing ? 'Senkronize Ediliyor...' : 'Garmin ile Senkronize Et'}
                    </button>
                </div>

                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <div className="text-center text-gray-400 py-12 bg-gray-800 rounded-xl">
                            <p>Henüz aktivite bulunamadı.</p>
                            <p className="text-sm mt-2">Garmin hesabınızdan veri çekmek için butona tıklayın.</p>
                        </div>
                    ) : (
                        activities.map(activity => (
                            <div key={activity.id} className="bg-gray-800 p-6 rounded-lg flex justify-between items-center hover:bg-gray-750 transition-colors">
                                <div>
                                    <div className="text-lg font-bold flex items-center gap-2">
                                        <span className="capitalize">{activity.sport_type}</span>
                                        <span className="text-gray-500 text-sm">• {new Date(activity.start_time).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-sm text-gray-400 mt-1">
                                        {Math.floor(activity.duration_seconds / 60)} dk • {(activity.distance_m / 1000).toFixed(2)} km
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-blue-400">{activity.avg_power}w</div>
                                    <div className="text-sm text-gray-400">Ort. Güç</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default Activities
