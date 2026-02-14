import { useState, useEffect } from 'react';
import client from './api/client';
import { StatsCard } from './components/StatsCard';
import { ActivityList } from './components/ActivityList';
import { AdviceBlock } from './components/AdviceBlock';
import { SettingsModal } from './components/SettingsModal';
import { TrainingPlan } from './components/TrainingPlan';
import { Login } from './components/Login';
import { ChatWidget } from './components/ChatWidget';
import { ActivityAnalysis } from './components/ActivityAnalysis';
import { MetricDetailModal } from './components/MetricDetailModal';
import PerformanceDashboard from './components/PerformanceDashboard';
import {
  Activity,
  Calendar,
  User,
  Settings,
  Moon,
  Sun,
  TrendingUp,
  Heart,
  Zap,
  Battery,
  Award,
  BarChart2,
  Loader2
} from 'lucide-react';

function App() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null); // 'heart_rate', 'sleep', 'stress', 'body_battery'
  const [showPerformance, setShowPerformance] = useState(false);

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

  const [credentials, setCredentials] = useState(null);
  const [settingsData, setSettingsData] = useState(null);

  const handleLogin = async (briefingData, creds) => {
    setLoading(true);
    setError(null);
    setCredentials(creds); // Store for later API calls (Plan generation)
    setData(briefingData); // Set the advice data directly from Login component

    try {
      // Fetch Settings (for language preference)
      try {
        const settingsRes = await client.get('/settings');
        setSettingsData(settingsRes.data);
      } catch (e) {
        console.warn("Could not fetch settings", e);
      }

      setIsAuthenticated(true);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "Login failed or could not fetch settings.";
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
  const profile = metrics?.profile || {};
  const healthStats = metrics?.health || {}; // Assuming healthStats is same as health for now
  const activities = metrics?.recent_activities || [];


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-garmin-dark text-gray-900 dark:text-white transition-colors duration-300">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-black/80 border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                AI Coach
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowPerformance(!showPerformance)}
                className={`p-2 rounded-lg transition-colors ${showPerformance ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
                title="Performance Dashboard"
              >
                <BarChart2 size={20} />
              </button>
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
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => {
          setIsSettingsOpen(false);
        }}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {showPerformance ? (
          <PerformanceDashboard onActivitySelect={setSelectedActivityId} />
        ) : (
          <>
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Welcome back, {profile?.firstName || 'Athlete'}! 👋
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Here's your training summary for today.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Resting HR"
                value={healthStats?.restingHeartRate || '--'}
                unit="bpm"
                icon={Heart}
                className="border-red-500/20"
                onClick={() => setSelectedMetric('resting_hr')}
              />
              <StatsCard
                title="Training Status"
                value="Productive"
                unit="Load: Optimal"
                icon={TrendingUp}
                className="border-green-500/20"
              />
              <StatsCard
                title="Body Battery"
                value={healthStats?.bodyBatteryMostRecentValue || '--'}
                unit="/ 100"
                icon={Battery}
                className="border-blue-500/20"
                onClick={() => setSelectedMetric('body_battery')}
              />
              <StatsCard
                title="VO2 Max"
                value={profile.vo2MaxRunning || profile.vo2Max || profile.vO2MaxValue || healthStats?.vo2Max || '--'}
                unit="ml/kg"
                icon={Zap}
                className="border-yellow-500/20"
              // onClick={() => setSelectedMetric('vo2_max')}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Advice Column */}
              <div className="lg:col-span-2 space-y-8">
                <AdviceBlock advice={advice} loading={loading} />

                {/* Weekly Volume Chart Placeholder */}
                <div className="glass-card p-6 rounded-2xl border border-gray-100 dark:border-white/10">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-gray-400" />
                    Weekly Volume
                  </h3>
                  <div className="h-64 flex items-end justify-between gap-2 px-4">
                    {[65, 45, 75, 50, 80, 60, 70].map((h, i) => (
                      <div key={i} className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-lg relative group">
                        <div
                          className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all duration-500 group-hover:bg-blue-400"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-xs text-gray-400">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                </div>
                <TrainingPlan userContext={{ ...data, credentials }} language={settingsData?.language || 'en'} />
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                <div className="glass-card p-6 rounded-2xl border border-gray-100 dark:border-white/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Next Race
                  </h3>
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-5 text-white">
                    <div className="text-sm opacity-90 mb-1">Ironman 70.3 Venice</div>
                    <div className="text-3xl font-bold mb-2">14 Days</div>
                    <div className="text-sm opacity-75">May 5, 2024</div>
                  </div>
                </div>

                <ActivityList
                  activities={activities}
                  onSelect={setSelectedActivityId}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Activity Analysis Modal */}
      {selectedActivityId && (
        <ActivityAnalysis
          activityId={selectedActivityId}
          onClose={() => setSelectedActivityId(null)}
        />
      )}

      {selectedMetric && (
        <MetricDetailModal
          metricType={selectedMetric}
          onClose={() => setSelectedMetric(null)}
          date={null} // defaulting to today inside modal handling
        />
      )}

      <ChatWidget userContext={{ health, sleep, metrics }} language={settingsData?.language || 'en'} />
    </div>
  );
}

export default App;
