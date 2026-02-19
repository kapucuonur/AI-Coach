
import { useState, useEffect } from 'react';
import client from '../api/client';
import { Watch, Smartphone, Battery, Signal } from 'lucide-react';

export function DeviceCard() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const response = await client.get('/garmin/devices');
                // Response is typically a list of devices
                setDevices(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch devices:', err);
                setError('Could not load devices.');
                setLoading(false);
            }
        };

        fetchDevices();
    }, []);

    if (loading) return null; // Or a skeleton
    if (error) return null; // Or show error
    if (!devices || devices.length === 0) return null;

    // Helper to score devices for display priority
    const getDeviceScore = (d) => {
        let score = 0;
        const name = (d.productDisplayName || d.modelName || "").toLowerCase();

        // Penalize known accessories
        if (name.includes('hrm') || name.includes('strap') || name.includes('monitor')) score -= 100;

        // Boost known watches (generic check, though usually if it's not an HRM it's likely a watch/computer in this context)
        if (name.includes('fenix') || name.includes('forerunner') || name.includes('vivo') || name.includes('epix') || name.includes('marq') || name.includes('instinct') || name.includes('edge') || name.includes('enduro')) score += 50;

        if (d.primary) score += 10;
        if (d.connectionStatus === 'CONNECTED') score += 5;

        return score;
    };

    // Sort devices by score descending
    const sortedDevices = [...devices].sort((a, b) => getDeviceScore(b) - getDeviceScore(a));
    const primaryDevice = sortedDevices[0];

    // Helper to get image URL if available
    const getDeviceImage = (device) => {
        if (!device) return null;
        if (device.imageUrl) return device.imageUrl;
        // Fallback to a generic image based on product name if possible, or just an icon
        // For now, we'll try to use the image URL provided by Garmin if it exists
        return null;
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4 transition-all duration-300 hover:shadow-md">
            <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {getDeviceImage(primaryDevice) ? (
                    <img src={getDeviceImage(primaryDevice)} alt={primaryDevice.productDisplayName} className="w-full h-full object-cover" />
                ) : (
                    <Watch className="w-8 h-8 text-gray-400" />
                )}
            </div>

            <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {primaryDevice.productDisplayName || primaryDevice.modelName || 'Garmin Device'}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${primaryDevice.connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {primaryDevice.connectionStatus === 'CONNECTED' ? 'Connected' : 'Last Synced'}
                    </span>
                    {/* Add more details if available, e.g., battery if exposed */}
                </div>
            </div>
        </div>
    );
}
