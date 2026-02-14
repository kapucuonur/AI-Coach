
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
    const [garminEmail, setGarminEmail] = useState('')
    const [garminPassword, setGarminPassword] = useState('')

    const [saved, setSaved] = useState(false)
    const [savingGarmin, setSavingGarmin] = useState(false)

    useEffect(() => {
        if (user) {
            setProfile({
                weight_kg: user.weight_kg || '',
                ftp_watts: user.ftp_watts || '',
                max_hr: user.max_hr || ''
            })
            // We don't fetch password for security, but we could fetch email if we wanted to show "Connected as..."
            if (user.garmin_email) {
                setGarminEmail(user.garmin_email)
            }
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
            alert('Profil güncellenemedi.')
        }
    }

    const handleSaveGarmin = async (e) => {
        e.preventDefault()
        setSavingGarmin(true)
        try {
            const token = localStorage.getItem('token')
            await axios.put(`${API_URL}/users/me/garmin-credentials`, {
                email: garminEmail,
                password: garminPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            alert('Garmin hesabı başarıyla bağlandı! Artık aktivitelerinizi senkronize edebilirsiniz.')
            setGarminPassword('') // Clear password from state for security
        } catch (error) {
            console.error('Garmin Save Error:', error)
            alert('Garmin bilgileri kaydedilemedi: ' + (error.response?.data?.detail || error.message))
        } finally {
            setSavingGarmin(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Profil Ayarları</h1>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Profil Formu */}
                    <div className="bg-gray-800 p-8 rounded-xl shadow-lg">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span>🏋️‍♂️</span> Fiziksel Profil
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Ağırlık (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={profile.weight_kg}
                                    onChange={e => setProfile({ ...profile, weight_kg: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">FTP (Watt)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={profile.ftp_watts}
                                    onChange={e => setProfile({ ...profile, ftp_watts: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Maksimum Nabız</label>
                                <input
                                    type="number"
                                    className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={profile.max_hr}
                                    onChange={e => setProfile({ ...profile, max_hr: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold transition-colors">
                                Kaydet
                            </button>

                            {saved && (
                                <div className="text-green-400 text-center text-sm">
                                    Profil güncellendi!
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Garmin Formu */}
                    <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-400">
                            <span>⌚</span> Garmin Connect
                        </h2>
                        <p className="text-sm text-gray-400 mb-6">
                            Aktivitelerinizi senkronize etmek için Garmin Connect hesap bilgilerinizi girin.
                            Bu bilgiler şifrelenerek saklanır.
                        </p>
                        <form onSubmit={handleSaveGarmin} className="space-y-6">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Garmin Email</label>
                                <input
                                    type="email"
                                    value={garminEmail}
                                    onChange={e => setGarminEmail(e.target.value)}
                                    className="w-full bg-gray-700 rounded p-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Garmin Şifre</label>
                                <input
                                    type="password"
                                    value={garminPassword}
                                    onChange={e => setGarminPassword(e.target.value)}
                                    className="w-full bg-gray-700 rounded p-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={savingGarmin}
                                className={`w-full py-2 rounded font-bold transition-colors ${savingGarmin
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-500'
                                    }`}
                            >
                                {savingGarmin ? 'Bağlanıyor...' : 'Garmin Hesabını Bağla'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Profile
