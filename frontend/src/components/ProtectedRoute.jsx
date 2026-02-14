
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth()
    if (loading) return <div className="text-center py-10">Yükleniyor...</div>
    if (!user) return <Navigate to="/login" replace />
    return children
}

export default ProtectedRoute
