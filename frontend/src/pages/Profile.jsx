
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const Profile = () => {
    const { user } = useAuth()
    const [profile, setProfile] = useState({
        weight_kg: '',
        ftp_watts: '',
        max_hr: ''
    })
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (user) {
            setProfile({
                weight_kg: user.weight_kg || '',
                ftp_watts: user.ftp_watts || '',
                max_hr: user.max_hr || ''
            })
        }
    }, [user])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await axios.put(`${API_URL}/users/me/profile`, {
                weight_kg: parseFloat(profile.weight_kg) || null,
                ftp_watts: parseInt(profile.ftp_watts) || null,
                max_hr: parseInt(profile.max_hr) || null
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (error) {
            console.error('Güncelleme hatası:', error)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-xl">
                    <h1 className="text-2xl font-bold mb-6">Profil Ayarları</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Ağırlık (kg)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="w-full p-2 rounded bg-gray-700 text-white"
                                value={profile.weight_kg}
                                onChange={e => setProfile({ ...profile, weight_kg: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">FTP (Watt)</label>
                            <input
                                type="number"
                                className="w-full p-2 rounded bg-gray-700 text-white"
                                value={profile.ftp_watts}
                                onChange={e => setProfile({ ...profile, ftp_watts: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Maksimum Nabız</label>
                            <input
                                type="number"
                                className="w-full p-2 rounded bg-gray-700 text-white"
                                value={profile.max_hr}
                                onChange={e => setProfile({ ...profile, max_hr: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="w-full btn-primary">
                            Kaydet
                        </button>

                        {saved && (
                            <div className="text-green-400 text-center text-sm">
                                Profil güncellendi!
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Profile
