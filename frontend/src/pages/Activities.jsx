
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const Activities = () => {
    const [activities, setActivities] = useState([])

    useEffect(() => {
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
        fetchActivities()
    }, [])

    return (
        <div className="min-h-screen bg-gray-900">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Geçmiş Aktiviteler</h1>
                <div className="space-y-4">
                    {activities.map(activity => (
                        <div key={activity.id} className="bg-gray-800 p-6 rounded-lg flex justify-between items-center">
                            <div>
                                <div className="text-lg font-bold">
                                    {new Date(activity.start_time).toLocaleDateString()} Sürüşü
                                </div>
                                <div className="text-sm text-gray-400">
                                    {Math.floor(activity.duration_seconds / 60)} dakika • {(activity.distance_m / 1000).toFixed(2)} km
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-blue-400">{activity.avg_power}w</div>
                                <div className="text-sm text-gray-400">Ort. Güç</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Activities
