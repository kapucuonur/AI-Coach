
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const Routes = () => {
    const [routes, setRoutes] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetchRoutes()
    }, [])

    const fetchRoutes = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`${API_URL}/routes`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setRoutes(response.data)
        } catch (error) {
            console.error('Rotalar alınamadı:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
                    <span>🚴‍♂️</span> Sanal Sürüş Rotaları
                </h1>

                <div className="mb-8 p-6 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl shadow-xl border border-purple-500 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">🗺️ Özgür Sürüş Modu</h2>
                        <p className="text-gray-200">Dünyanın herhangi bir yerini seçin ve sürmeye başlayın.</p>
                    </div>
                    <button
                        onClick={() => navigate('/free-ride')}
                        className="bg-white text-purple-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
                    >
                        Haritadan Seç 🌍
                    </button>
                </div>

                {loading ? (
                    <div className="text-center text-gray-400 py-12">Yükleniyor...</div>
                ) : routes.length === 0 ? (
                    <div className="text-center text-gray-500 py-12 bg-gray-800 rounded-xl">
                        <p className="mb-4">Henüz rota bulunmuyor.</p>
                        <p className="text-sm">Yönetici panelinden rota eklenmesi gerekiyor.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {routes.map(route => (
                            <div key={route.id} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 hover:border-blue-500 transition-colors">
                                {/* Rota Görseli (Placeholder) */}
                                <div className="h-40 bg-gradient-to-r from-blue-900 to-gray-800 flex items-center justify-center">
                                    <span className="text-4xl">⛰️</span>
                                </div>

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">{route.name}</h3>
                                            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                                                {route.country}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm text-gray-400">Zorluk</span>
                                            <div className="flex text-yellow-500">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i}>{i < route.difficulty ? '★' : '☆'}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-6 text-center text-sm">
                                        <div className="bg-gray-900 p-2 rounded">
                                            <div className="text-gray-400">Mesafe</div>
                                            <div className="font-bold">{route.distance_km} km</div>
                                        </div>
                                        <div className="bg-gray-900 p-2 rounded">
                                            <div className="text-gray-400">Yükseklik</div>
                                            <div className="font-bold">{route.elevation_gain_m} m</div>
                                        </div>
                                        <div className="bg-gray-900 p-2 rounded">
                                            <div className="text-gray-400">Max Eğim</div>
                                            <div className="font-bold">%{route.max_gradient}</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate(`/ride/${route.id}`)}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span>🚴‍♂️</span> Sürüşe Başla
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Routes
