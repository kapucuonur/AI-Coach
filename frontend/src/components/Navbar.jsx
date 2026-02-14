
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

import { useTranslation } from 'react-i18next'

const Navbar = () => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng)
    }

    if (!user) return null

    return (
        <nav className="bg-gray-800 shadow-lg">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="text-xl font-bold text-blue-400 flex items-center gap-2">
                        <span>🚴</span>
                        <span className="hidden sm:inline">AI-Coach</span>
                    </Link>
                    <div className="flex items-center space-x-4">
                        <Link to="/" className="hover:text-blue-400 text-sm hidden md:block">{t('navbar.dashboard')}</Link>
                        <Link to="/routes" className="hover:text-blue-400 font-bold text-green-400 text-sm hidden md:block">{t('navbar.trainer')} 🚴‍♂️</Link>
                        <Link to="/coach" className="hover:text-blue-400 text-sm hidden md:block">{t('navbar.coach')}</Link>
                        <Link to="/activities" className="hover:text-blue-400 text-sm hidden md:block">{t('navbar.activities')}</Link>
                        <Link to="/profile" className="hover:text-blue-400 text-sm hidden md:block">{t('navbar.profile')}</Link>

                        {/* Language Switcher */}
                        <select
                            onChange={(e) => changeLanguage(e.target.value)}
                            value={i18n.language}
                            className="bg-gray-700 text-white text-xs rounded p-1 border border-gray-600 focus:outline-none focus:border-blue-500"
                        >
                            <option value="en">🇬🇧 EN</option>
                            <option value="tr">🇹🇷 TR</option>
                            <option value="fr">🇫🇷 FR</option>
                            <option value="it">🇮🇹 IT</option>
                            <option value="ru">🇷🇺 RU</option>
                            <option value="de">🇩🇪 DE</option>
                        </select>

                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-xs hidden lg:inline">{user.full_name}</span>
                            <button onClick={() => { logout(); navigate('/login') }} className="text-red-400 text-sm hover:text-red-300">
                                {t('navbar.logout')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Links (Visible only on small screens) */}
                <div className="md:hidden flex justify-around py-2 border-t border-gray-700">
                    <Link to="/" className="text-xl">🏠</Link>
                    <Link to="/routes" className="text-xl">🚴‍♂️</Link>
                    <Link to="/coach" className="text-xl">🤖</Link>
                    <Link to="/profile" className="text-xl">👤</Link>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
