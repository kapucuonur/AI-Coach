
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
            alert('Giriş başarısız! Lütfen bilgilerinizi kontrol edin.')
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background Video */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute w-full h-full object-cover z-0"
            >
                <source src="/login-background.mp4" type="video/mp4" />
            </video>

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/60 z-10"></div>

            {/* Content Container */}
            <div className="relative z-20 container mx-auto px-4 flex flex-col md:flex-row items-center justify-between h-full">

                {/* Left Side: Marketing Text */}
                <div className="text-white max-w-2xl mb-12 md:mb-0 text-center md:text-left">
                    <h3 className="text-blue-400 font-bold tracking-[0.2em] uppercase mb-4 animate-fade-in-up">
                        Your Personal AI Coach
                    </h3>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in-up delay-100">
                        Train Smarter,<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
                            Not Harder.
                        </span>
                    </h1>
                    <p className="text-xl text-gray-300 mb-8 max-w-lg animate-fade-in-up delay-200">
                        Advanced metrics, virtual rides, and personalized AI coaching to take your performance to the next level.
                    </p>

                    <div className="flex gap-4 justify-center md:justify-start animate-fade-in-up delay-300">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            AI Powered
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Virtual Ride
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            3D Maps
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="bg-gray-900/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700/50 animate-fade-in-up delay-300">
                    <h2 className="text-3xl font-bold mb-8 text-center text-white">
                        {isRegistering ? 'Join the Revolution' : 'Welcome Back'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isRegistering && (
                            <div className="group">
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    className="w-full p-4 rounded-lg bg-gray-800/80 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="group">
                            <input
                                type="email"
                                placeholder="Email Address"
                                className="w-full p-4 rounded-lg bg-gray-800/80 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="group">
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full p-4 rounded-lg bg-gray-800/80 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-600/30"
                        >
                            {isRegistering ? 'Get Started' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-gray-400 hover:text-white text-sm transition-colors"
                        >
                            {isRegistering
                                ? 'Already have an account? Sign in'
                                : "Don't have an account? Sign up free"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
