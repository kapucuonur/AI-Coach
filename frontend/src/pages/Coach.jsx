
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const Coach = () => {
    const { user } = useAuth()
    const [messages, setMessages] = useState([
        { role: 'coach', content: `Merhaba ${user?.full_name || ''}! Ben senin yapay zeka antrenörünüm. Bugün sana nasıl yardımcı olabilirim?` }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [dailyAdvice, setDailyAdvice] = useState('')

    useEffect(() => {
        fetchDailyAdvice()
    }, [])

    const fetchDailyAdvice = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`${API_URL}/coach/daily-advice`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setDailyAdvice(response.data.advice)
        } catch (error) {
            console.error('Tavsiye alınamadı:', error)
        }
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!input.trim()) return

        const userMessage = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)

        try {
            const token = localStorage.getItem('token')
            const response = await axios.post(`${API_URL}/coach/chat`, {
                message: input
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            const coachMessage = { role: 'coach', content: response.data.advice }
            setMessages(prev => [...prev, coachMessage])
        } catch (error) {
            setMessages(prev => [...prev, { role: 'coach', content: 'Üzgünüm, şu an cevap veremiyorum.' }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            <Navbar />

            <div className="container mx-auto px-4 py-8 flex-grow flex flex-col max-w-4xl">

                {/* Günlük Tavsiye Kartı */}
                {dailyAdvice && (
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 rounded-lg mb-8 shadow-xl border border-blue-700">
                        <h3 className="text-xl font-bold mb-2 text-blue-200">💡 Günün Tavsiyesi</h3>
                        <p className="text-white italic">"{dailyAdvice}"</p>
                    </div>
                )}

                {/* Chat Alanı */}
                <div className="bg-gray-800 rounded-lg shadow-xl flex-grow flex flex-col overflow-hidden">
                    <div className="bg-gray-700 p-4 border-b border-gray-600">
                        <h2 className="text-lg font-bold flex items-center">
                            🤖 AI Antrenör
                            <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Online</span>
                        </h2>
                    </div>

                    <div className="flex-grow p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-gray-600 text-white rounded-bl-none'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-600 text-white rounded-lg p-3 rounded-bl-none animate-pulse">
                                    Yazıyor...
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="p-4 bg-gray-750 border-t border-gray-600 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Antrenörüne bir şey sor..."
                            className="flex-grow p-3 rounded bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold disabled:opacity-50"
                        >
                            Gönder
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Coach
