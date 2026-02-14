
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const Dashboard = () => {
    const [routes, setRoutes] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRoutes()
    }, [])

    const fetchRoutes = async () => {
        try {
            const response = await axios.get(`${API_URL}/routes`)
            setRoutes(response.data)
        } catch (error) {
            console.error('Rota yükleme hatası:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Rotalar</h1>

                {loading ? (
                    <div className="text-center">Yükleniyor...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {routes.map(route => (
                            <div key={route.id} className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-2xl transition-shadow">
                                <div className="h-40 bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                                    <span className="text-4xl">🏔️</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2">{route.name}</h3>
                                <div className="flex justify-between text-gray-400 mb-4">
                                    <span>{route.distance_km} km</span>
                                    <span>{route.elevation_gain_m}m ↗</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`px-2 py-1 rounded text-sm ${route.difficulty > 3 ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'
                                        }`}>
                                        Zorluk: {route.difficulty}/5
                                    </span>
                                    <Link
                                        to={`/ride/${route.id}`}
                                        className="btn-primary"
                                    >
                                        Sürüşe Başla
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Dashboard
