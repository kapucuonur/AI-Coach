import { useState, useEffect } from 'react';
import client from '../api/client';
import { Watch, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DeviceSelectModal({ isOpen, onClose, onSelect }) {
    const { t } = useTranslation();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;

        const fetchDevices = async () => {
            setLoading(true);
            try {
                const response = await client.get('/garmin/devices');
                if (isMounted) {
                    setDevices(response.data);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to fetch devices:', err);
                if (isMounted) {
                    setError('Could not load devices.');
                    setLoading(false);
                }
            }
        };

        fetchDevices();
        return () => { isMounted = false; };
    }, [isOpen]);

    if (!isOpen) return null;

    // Helper to score devices for display priority
    const getDeviceScore = (d) => {
        let score = 0;
        const name = (d.productDisplayName || d.modelName || "").toLowerCase();

        if (name.includes('hrm') || name.includes('strap') || name.includes('monitor')) score -= 100;
        if (name.includes('fenix') || name.includes('forerunner') || name.includes('vivo') || name.includes('epix') || name.includes('marq') || name.includes('instinct') || name.includes('edge') || name.includes('enduro')) score += 50;
        if (d.primary) score += 10;
        if (d.connectionStatus === 'CONNECTED') score += 5;

        return score;
    };

    const sortedDevices = [...devices].sort((a, b) => getDeviceScore(b) - getDeviceScore(a));

    const getDeviceImage = (device) => {
        if (!device) return null;
        if (device.imageUrl) return device.imageUrl;
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-garmin-card w-full max-w-md rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Watch size={20} className="text-garmin-blue" />
                        {t('select_device') || "Select Device"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-garmin-blue animate-spin mb-4" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading devices...</p>
                        </div>
                    ) : error ? (
                        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                            <AlertCircle size={20} />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    ) : sortedDevices.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 py-8">No Garmin devices found.</p>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 tracking-wide">
                                Choose which device to send the training program to:
                            </p>
                            {sortedDevices.map((device, idx) => (
                                <button
                                    key={device.deviceId || idx}
                                    onClick={() => onSelect(device)}
                                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 hover:bg-white dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center p-2 shadow-sm flex-shrink-0">
                                            {getDeviceImage(device) ? (
                                                <img src={getDeviceImage(device)} alt={device.productDisplayName} className="w-full h-full object-contain" />
                                            ) : (
                                                <Watch className="w-6 h-6 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                                                {device.productDisplayName || device.modelName || 'Garmin Device'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${device.connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                {device.connectionStatus === 'CONNECTED' ? 'Connected' : 'Offline'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 text-garmin-blue p-2 bg-blue-50 dark:bg-garmin-blue/10 rounded-full transition-opacity">
                                        <Check size={18} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
