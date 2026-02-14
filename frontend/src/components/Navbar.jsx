
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const Navbar = () => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    if (!user) return null

    return (
        <nav className="bg-gray-800 shadow-lg">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="text-xl font-bold text-blue-400">
                        🚴 AI-Coach
                    </Link>
                    <div className="flex items-center space-x-6">
                        <Link to="/" className="hover:text-blue-400">Dashboard</Link>
                        <Link to="/routes" className="hover:text-blue-400 font-bold text-green-400">Trainer 🚴‍♂️</Link>
                        <Link to="/coach" className="hover:text-blue-400">Antrenör</Link>
                        <Link to="/activities" className="hover:text-blue-400">Aktiviteler</Link>
                        <Link to="/profile" className="hover:text-blue-400">Profil</Link>
                        <span className="text-gray-400">{user.full_name}</span>
                        <button onClick={() => { logout(); navigate('/login') }} className="text-red-400">
                            Çıkış
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
