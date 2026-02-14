
import { useState, useCallback, useRef } from 'react'

const FTMS_SERVICE = '00001826-0000-1000-8000-00805f9b34fb'
const INDOOR_BIKE_DATA = '00002ad2-0000-1000-8000-00805f9b34fb'
const FTMS_CONTROL = '00002ad9-0000-1000-8000-00805f9b34fb'

export const useWebBluetooth = () => {
    const [device, setDevice] = useState(null)
    const [connected, setConnected] = useState(false)
    const [metrics, setMetrics] = useState({
        power: 0,
        cadence: 0,
        speed: 0,
        heartRate: null
    })

    const controlCharRef = useRef(null)

    const scanAndConnect = useCallback(async () => {
        try {
            const selectedDevice = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [FTMS_SERVICE] },
                    { namePrefix: 'KICKR' },
                    { namePrefix: 'Tacx' },
                    { namePrefix: 'Elite' },
                    { namePrefix: 'Wahoo' }
                ],
                optionalServices: [FTMS_SERVICE]
            })

            const server = await selectedDevice.gatt.connect()
            const service = await server.getPrimaryService(FTMS_SERVICE)

            const bikeDataChar = await service.getCharacteristic(INDOOR_BIKE_DATA)
            await bikeDataChar.startNotifications()

            bikeDataChar.addEventListener('characteristicvaluechanged', (event) => {
                const value = event.target.value
                const data = parseBikeData(value)
                setMetrics(data)
            })

            controlCharRef.current = await service.getCharacteristic(FTMS_CONTROL)
            await controlCharRef.current.writeValue(new Uint8Array([0x00]))

            setDevice(selectedDevice)
            setConnected(true)

            selectedDevice.addEventListener('gattserverdisconnected', () => {
                setConnected(false)
                setDevice(null)
            })

            return true
        } catch (error) {
            console.error('BLE Hatası:', error)
            return false
        }
    }, [])

    const disconnect = useCallback(async () => {
        if (device && device.gatt.connected) {
            await device.gatt.disconnect()
        }
        setConnected(false)
        setDevice(null)
    }, [device])

    const setSlope = useCallback(async (gradient) => {
        if (!controlCharRef.current || !connected) return

        try {
            const slopeValue = Math.round(gradient * 10)
            const buffer = new ArrayBuffer(3)
            const view = new DataView(buffer)
            view.setUint8(0, 0x11)
            view.setInt16(1, slopeValue, true)

            await controlCharRef.current.writeValue(buffer)
        } catch (error) {
            console.error('Eğim ayarlama hatası:', error)
        }
    }, [connected])

    return { scanAndConnect, disconnect, setSlope, connected, metrics }
}

function parseBikeData(value) {
    const data = {}
    const flags = value.getUint16(0, true)
    let index = 2

    if (flags & 0x01) {
        data.speed = value.getUint16(index, true) * 0.01
        index += 2
    }
    if (flags & 0x04) {
        data.cadence = value.getUint16(index, true) * 0.5
        index += 2
    }
    if (flags & 0x40) {
        data.power = value.getInt16(index, true)
        index += 2
    }
    if (flags & 0x200) {
        data.heartRate = value.getUint8(index)
    }

    return data
}
