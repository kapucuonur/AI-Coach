
import { useState, useCallback, useRef, useEffect } from 'react'
import { useWebBluetooth } from './useWebBluetooth.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://')

export const useVirtualRide = (routeId) => {
    const [status, setStatus] = useState('idle')
    const [rideData, setRideData] = useState({
        distance: 0,
        elevation: 0,
        gradient: 0,
        speed: 0,
        power: 0,
        cadence: 0,
        progress: 0
    })

    const wsRef = useRef(null)
    const { metrics, setSlope, connected: trainerConnected } = useWebBluetooth()

    const connectWebSocket = useCallback((userId) => {
        const wsUrl = `${WS_URL}/virtual-ride/ws/ride/${userId}`
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
            setStatus('active')
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'PING' }))
                }
            }, 15000)
            ws.pingInterval = pingInterval
        }

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)

            switch (message.type) {
                case 'RIDE_UPDATE':
                    setRideData(prev => ({ ...prev, ...message.data }))
                    if (message.data.gradient !== undefined) {
                        setSlope(message.data.gradient)
                    }
                    break
                case 'RIDE_COMPLETE':
                    setStatus('completed')
                    cleanup()
                    break
                case 'SERVER_PING':
                    ws.send(JSON.stringify({ type: 'PONG' }))
                    break
            }
        }

        ws.onerror = () => setStatus('error')
        ws.onclose = () => {
            clearInterval(ws.pingInterval)
            if (status === 'active') {
                setTimeout(() => connectWebSocket(userId), 5000)
            }
        }
    }, [setSlope, status])

    const startRide = useCallback(async () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        if (!user.id) return alert('Lütfen giriş yapın')

        const response = await fetch(`${API_URL}/virtual-ride/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ user_id: user.id, route_id: parseInt(routeId) })
        })

        const data = await response.json()
        if (data.status === 'started') {
            connectWebSocket(user.id)

            setInterval(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'TRAINER_DATA',
                        data: {
                            power: metrics.power,
                            cadence: metrics.cadence,
                            speed: metrics.speed,
                            heart_rate: metrics.heartRate
                        }
                    }))
                }
            }, 1000)
        }
    }, [routeId, connectWebSocket, metrics])

    const finishRide = useCallback(async () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const response = await fetch(`${API_URL}/virtual-ride/finish/${user.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        cleanup()
        return response.json()
    }, [])

    const cleanup = () => {
        if (wsRef.current) {
            clearInterval(wsRef.current.pingInterval)
            wsRef.current.close()
        }
    }

    useEffect(() => cleanup, [])

    return { status, rideData, metrics, trainerConnected, startRide, finishRide }
}
