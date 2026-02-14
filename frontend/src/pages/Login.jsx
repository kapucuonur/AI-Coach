
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isRegistering, setIsRegistering] = useState(false)
    const [fullName, setFullName] = useState('')
    const { login, register } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (isRegistering) {
                await register(email, password, fullName)
            } else {
                await login(email, password)
            }
            navigate('/')
        } catch (error) {
            alert('Giriş başarısız!')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
                <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">
                    {isRegistering ? 'Kayit Ol' : 'Giriş Yap'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegistering && (
                        <input
                            type="text"
                            placeholder="Ad Soyad"
                            className="w-full p-2 rounded bg-gray-700 text-white"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-2 rounded bg-gray-700 text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Şifre"
                        className="w-full p-2 rounded bg-gray-700 text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="submit" className="w-full btn-primary">
                        {isRegistering ? 'Kaydol' : 'Giriş Yap'}
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                        {isRegistering ? 'Hesabın var mı? Giriş yap' : 'Hesabın yok mu? Kaydol'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Login
