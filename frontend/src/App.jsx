import { useState, useEffect } from 'react';
import client from './api/client';
import { StatsCard } from './components/StatsCard';
import { ActivityList } from './components/ActivityList';
import { AdviceBlock } from './components/AdviceBlock';
import { SettingsModal } from './components/SettingsModal';
import { Login } from './components/Login';
import { Heart, Activity, Moon, Sun, Battery, Loader2, Settings } from 'lucide-react';

function App() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Dark mode state - defaulting to true or system preference could be added
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleLogin = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.post('/coach/daily-briefing', credentials);
      setData(res.data);
      setIsAuthenticated(true);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "Login failed or could not fetch plan. Check credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-garmin-dark transition-colors duration-300">
        {/* Simple dark mode toggle for login screen */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-garmin-blue dark:hover:text-white rounded-full transition-colors"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
        <Login onLogin={handleLogin} isLoading={loading} error={error} />
      </div>
    );
  }

  // Loading state for subsequent operations if any
  if (loading && isAuthenticated) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-garmin-dark text-gray-900 dark:text-white transition-colors">
        <Loader2 className="w-12 h-12 animate-spin text-garmin-blue mb-4" />
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Updating data...</p>
      </div>
    );
  }

  const { metrics, advice, workout } = data || {}; // Safe destructuring
  const health = metrics?.health || {};
  const sleep = metrics?.sleep || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-garmin-dark text-gray-900 dark:text-white p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">AI Coach Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Your daily training intelligence</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-garmin-blue dark:hover:text-white rounded-full transition-colors bg-white dark:bg-transparent border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <div className="flex items-center gap-2"><span>Light</span> <Sun size={24} /></div> : <div className="flex items-center gap-2"><span>Dark</span> <Moon size={24} /></div>}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-garmin-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <Settings size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Online</span>
            </div>

            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-sm text-red-500 hover:text-red-400 ml-2"
            >
              Logout
            </button>
          </div>
        </header>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={() => {
            // Re-fetching would require saving credentials which we avoid for security in this 'stateless' flow
            // For now, we might just close or warn user they need to relogin to see effects
            setIsSettingsOpen(false);
          }}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Resting HR"
            value={health.restingHeartRate || '--'}
            unit="bpm"
            icon={Heart}
            className="border-red-500/20"
          />
          <StatsCard
            title="Stress"
            value={health.averageStressLevel || '--'}
            unit="/100"
            icon={Activity}
            className="border-orange-500/20"
          />
          <StatsCard
            title="Body Battery"
            value={health.bodyBatteryMostRecentValue || '--'}
            unit="%"
            icon={Battery}
            className="border-blue-500/20"
          />
          <StatsCard
            title="Sleep"
            value={sleep.dailySleepDTO?.sleepTimeSeconds ? (sleep.dailySleepDTO.sleepTimeSeconds / 3600).toFixed(1) : '--'}
            unit="hrs"
            icon={Moon}
            className="border-purple-500/20"
          />
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Coach Advice (Merged column) */}
          <div className="lg:col-span-2 space-y-4">
            <AdviceBlock advice={advice} workout={workout} />
          </div>

          {/* Right: Activities */}
          <div className="lg:col-span-1">
            <ActivityList activities={metrics?.recent_activities || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
