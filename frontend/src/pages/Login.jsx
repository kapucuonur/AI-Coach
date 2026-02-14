import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

const SLIDES = [
    {
        video: '/video-swim.mp4',
        title: 'Swim',
        subtitle: 'Master the Water',
        color: 'from-blue-400 to-cyan-300'
    },
    {
        video: '/video-road-bike.mp4',
        title: 'Bike',
        subtitle: 'Conquer the Road',
        color: 'from-orange-400 to-red-400'
    },
    {
        video: '/video-run.mp4',
        title: 'Run',
        subtitle: 'Break Your Limits',
        color: 'from-green-400 to-emerald-300'
    },
    {
        video: '/video-triathlon.mp4',
        title: 'Triathlon',
        subtitle: 'Defy Your Limits',
        color: 'from-teal-400 to-blue-500'
    },
    {
        video: '/video-strength.mp4',
        title: 'Strength',
        subtitle: 'Build Your Foundation',
        color: 'from-purple-400 to-pink-300'
    }
]

const Login = () => {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isRegistering, setIsRegistering] = useState(false)
    const [fullName, setFullName] = useState('')
    const { login, register } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
        }, 6000) // Change slide every 6 seconds
        return () => clearInterval(timer)
    }, [])

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
            console.error("Login/Register Error:", error)
            const message = error.response?.data?.detail || 'Giriş başarısız! Lütfen bilgilerinizi kontrol edin.'
            alert(message)
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
            {/* Background Video Carousel */}
            {SLIDES.map((slide, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${currentSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0'
                        }`}
                >
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute w-full h-full object-cover"
                    >
                        <source src={slide.video} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-black/60"></div>
                </div>
            ))}

            {/* Content Container */}
            <div className="relative z-20 container mx-auto px-4 flex flex-col md:flex-row items-center justify-between h-full w-full max-w-6xl">

                {/* Left Side: Dynamic Marketing Text */}
                <div className="text-white max-w-2xl mb-12 md:mb-0 text-center md:text-left mt-20 md:mt-0">
                    <div className="h-40 relative">
                        {SLIDES.map((slide, index) => (
                            <div
                                key={index}
                                className={`absolute top-0 left-0 w-full transition-all duration-1000 transform ${currentSlide === index
                                    ? 'opacity-100 translate-y-0'
                                    : 'opacity-0 translate-y-8 pointer-events-none'
                                    }`}
                            >
                                <h3 className={`text-2xl font-bold tracking-[0.2em] uppercase mb-2 bg-gradient-to-r ${slide.color} bg-clip-text text-transparent`}>
                                    {slide.subtitle}
                                </h3>
                                <h1 className="text-7xl md:text-9xl font-black mb-6 leading-none tracking-tighter">
                                    {slide.title}
                                </h1>
                            </div>
                        ))}
                    </div>

                    <p className="text-xl text-gray-300 mb-8 max-w-lg animate-fade-in-up delay-200 mt-4">
                        The ultimate AI-powered training platform for athletes.
                        Analyze, Train, and Perform at your peak.
                    </p>

                    <div className="flex gap-4 justify-center md:justify-start animate-fade-in-up delay-300">
                        {SLIDES.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-12 bg-white' : 'w-2 bg-gray-500 hover:bg-gray-400'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="bg-gray-900/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 animate-fade-in-up delay-300">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {isRegistering ? 'Start Your Journey' : 'Welcome Back'}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            {isRegistering ? 'Join elite athletes today' : 'Continue your training streak'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegistering && (
                            <div className="group">
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    className="w-full p-4 rounded-xl bg-black/40 text-white border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none placeholder-gray-500"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="group">
                            <input
                                type="email"
                                placeholder="Email Address"
                                className="w-full p-4 rounded-xl bg-black/40 text-white border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none placeholder-gray-500"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="group">
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full p-4 rounded-xl bg-black/40 text-white border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none placeholder-gray-500"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-white text-black hover:bg-gray-200 font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
                        >
                            {isRegistering ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-gray-400 hover:text-white text-sm transition-colors font-medium"
                        >
                            {isRegistering
                                ? 'Already have an account? Log in'
                                : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
