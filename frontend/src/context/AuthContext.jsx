
import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            fetchUser()
        } else {
            setLoading(false)
        }
    }, [token])

    const fetchUser = async () => {
        try {
            const response = await axios.get(`${API_URL}/users/me`)
            setUser(response.data)
        } catch (error) {
            logout()
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        const formData = new FormData()
        formData.append('username', email)
        formData.append('password', password)

        const response = await axios.post(`${API_URL}/auth/login`, formData)
        const { access_token } = response.data

        localStorage.setItem('token', access_token)
        setToken(access_token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

        await fetchUser()
        return true
    }

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
        delete axios.defaults.headers.common['Authorization']
    }

    const register = async (email, password, fullName) => {
        await axios.post(`${API_URL}/auth/register`, {
            email,
            password,
            full_name: fullName
        })
        return login(email, password)
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
