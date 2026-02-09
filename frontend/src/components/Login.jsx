import { useState } from 'react';
// import { Loader2, Lock } from 'lucide-react'; // Removed as per new UI
// import { Loader2, Lock } from 'lucide-react'; // Removed as per new UI
import client from '../api/client';


export function Login({ onLogin }) { // Reverted onLoginSuccess to onLogin to match App.jsx usage
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [showMfa, setShowMfa] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(''); // error is now state, not prop

    const handleLogin = async (e) => { // Renamed handleSubmit to handleLogin
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                email,
                password,
                mfa_code: mfaCode || null
            };

            const response = await client.post('/coach/daily-briefing', payload);

            // If successful, data is in response.data
            // If successful, data is in response.data
            // Pass both data and the credentials payload to parent
            onLogin(response.data, payload);
        } catch (err) {
            console.error("Login Error:", err);
            const errorMsg = err.response?.data?.detail || "Login failed. Check credentials.";

            if (errorMsg === "MFA_REQUIRED") {
                setShowMfa(true);
                setError("Garmin sent a verification code to your email. Please enter it below.");
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-garmin-dark dark:text-white px-4">
            <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-garmin-blue rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                        Connect Garmin
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Sign in with your Garmin Connect credentials to generate your AI coaching plan.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-zinc-800 rounded-t-md focus:outline-none focus:ring-garmin-blue focus:border-garmin-blue focus:z-10 sm:text-sm transition-colors"
                                placeholder="Email address"
                                disabled={loading || showMfa}
                            />
                        </div>
                        <div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-zinc-800 rounded-b-md focus:outline-none focus:ring-garmin-blue focus:border-garmin-blue focus:z-10 sm:text-sm transition-colors"
                                placeholder="Password"
                                disabled={loading || showMfa}
                            />
                        </div>
                        {showMfa && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={mfaCode}
                                    onChange={(e) => setMfaCode(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-zinc-800 rounded-md focus:outline-none focus:ring-garmin-blue focus:border-garmin-blue sm:text-sm transition-colors"
                                    placeholder="Enter code from email"
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-garmin-blue hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-garmin-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Connecting...
                                </span>
                            ) : (
                                showMfa ? "Verify & Login" : "Sign In & Generate Plan"
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-4">
                        Your credentials are sent securely to the backend and are not stored.
                    </p>
                </form>
            </div>
        </div>
    );
}
