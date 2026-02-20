import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { NutritionTracker } from './components/NutritionTracker';
import { YearlyStats } from './components/YearlyStats';
import { DeviceCard } from './components/DeviceCard';
import { Heart, Activity, Moon, Sun, Battery, Loader2, Settings, Zap } from 'lucide-react';

function App() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);

  // Interaction States
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);

  // Dark mode state
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

  // Trigger AI generation AFTER dashboard loads
  useEffect(() => {
    const fetchAIAdvice = async () => {
      if (!isAuthenticated || !credentials || !data || data.advice) return;

      setIsGeneratingAdvice(true);
      try {
        const payload = {
          ...credentials, // email, password, mfa etc
          todays_activities: data.todays_activities || [],
          activities_summary_dict: data.metrics?.weekly_volume || {},
          health_stats: data.metrics?.health || {},
          sleep_data: data.metrics?.sleep || {},
          profile: data.metrics?.profile || {}
        };

        const res = await client.post('/coach/generate-advice', payload);

        setData(prev => ({
          ...prev,
          advice: res.data.advice,
          workout: res.data.workout
        }));
      } catch (err) {
        console.error("Failed to generate AI advice in background", err);
        setData(prev => ({
          ...prev,
          advice: "Sorry, I could not generate your advice right now. Please try again later.",
          workout: null
        }));
      } finally {
        setIsGeneratingAdvice(false);
      }
    };

    fetchAIAdvice();
  }, [isAuthenticated]);

  const handleLogin = async (briefingData, creds) => {
    setLoading(true);
    setError(null);
    setCredentials(creds);

    // Merge briefing data with profile data
    let enrichedData = { ...briefingData };

    try {
      // Store JWT token if present in response
      if (briefingData.access_token) {
        localStorage.setItem('access_token', briefingData.access_token);
        console.log('JWT token stored successfully');
      }

      // Fetch settings
      try {
        const settingsRes = await client.get('/settings');
        setSettingsData(settingsRes.data);
        if (settingsRes.data.language) {
          i18n.changeLanguage(settingsRes.data.language);
        }
      } catch (e) {
        console.warn("Could not fetch settings", e);
      }

      // Fetch profile data for VO2 max and other metrics
      try {
        const profileRes = await client.get('/dashboard/profile');
        // Merge profile into metrics if it exists
        if (profileRes.data) {
          enrichedData = {
            ...enrichedData,
            metrics: {
              ...enrichedData.metrics,
              profile: profileRes.data
            }
          };
        }
      } catch (e) {
        console.warn("Could not fetch profile data", e);
      }

      setData(enrichedData);
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

  if (loading && isAuthenticated) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-garmin-dark text-gray-900 dark:text-white transition-colors">
        <Loader2 className="w-12 h-12 animate-spin text-garmin-blue mb-4" />
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t('updating_data')}</p>
      </div>
    );
  }

  const { metrics, advice, workout } = data || {};
  const health = metrics?.health || {};
  const sleep = metrics?.sleep || {};
  const profile = metrics?.profile || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-garmin-dark text-gray-900 dark:text-white p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('dashboard_title')}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t('daily_intelligence')}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-garmin-blue dark:hover:text-white rounded-full transition-colors bg-white dark:bg-transparent border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none"
              title={darkMode ? t('switch_to_light_mode') : t('switch_to_dark_mode')}
            >
              {darkMode ? <div className="flex items-center gap-2"><span>{t('light')}</span> <Sun size={24} /></div> : <div className="flex items-center gap-2"><span>{t('dark')}</span> <Moon size={24} /></div>}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-garmin-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <Settings size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('online')}</span>
            </div>

            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-sm text-red-500 hover:text-red-400 ml-2"
            >
              {t('logout')}
            </button>
          </div>
        </header>

        {/* Sync Reminder Note */}
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                {t('sync_reminder')}
              </p>
            </div>
          </div>
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={() => {
            setIsSettingsOpen(false);
          }}
        />

        {/* Stats Grid - Now Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatsCard
            title={t('resting_hr')}
            value={health.restingHeartRate || '--'}
            unit={t('bpm')}
            icon={Heart}
            className="border-red-500/20"
            onClick={() => setSelectedMetric({ key: 'resting_hr', title: t('resting_hr'), unit: t('bpm'), color: '#ef4444' })}
          />
          <StatsCard
            title={t('vo2_max')}
            value={profile.vo2Max || profile.vo2MaxValue || profile.vo2MaxRunning || profile.vo2MaxPrecise || '--'}
            unit="ml/kg"
            icon={Zap}
            className="border-yellow-500/20"
            onClick={() => setSelectedMetric({ key: 'vo2_max', title: t('vo2_max'), unit: 'ml/kg', color: '#eab308' })}
          />
          <StatsCard
            title={t('stress')}
            value={health.averageStressLevel || '--'}
            unit="/100"
            icon={Activity}
            className="border-orange-500/20"
            onClick={() => setSelectedMetric({ key: 'stress', title: t('stress'), unit: '', color: '#f97316' })}
          />
          <StatsCard
            title={t('body_battery')}
            value={health.bodyBatteryMostRecentValue || '--'}
            unit="%"
            icon={Battery}
            className="border-blue-500/20"
            onClick={() => setSelectedMetric({ key: 'body_battery', title: t('body_battery'), unit: '%', color: '#3b82f6' })}
          />
          <StatsCard
            title={t('sleep')}
            value={sleep.dailySleepDTO?.sleepTimeSeconds ? (sleep.dailySleepDTO.sleepTimeSeconds / 3600).toFixed(1) : '--'}
            unit={t('hrs')}
            icon={Moon}
            className="border-purple-500/20"
            onClick={() => setSelectedMetric({ key: 'sleep', title: t('sleep'), unit: t('hrs'), color: '#a855f7' })}
          />
          <StatsCard
            title={t('fitness_age')}
            value={profile.fitnessAge ? Number(profile.fitnessAge).toFixed(1) : '--'}
            unit={t('yrs')}
            icon={Zap}
            className="border-green-500/20"
          />
        </div>

        {/* Nutrition Tracking */}
        <NutritionTracker />


        {/* Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Coach Advice & Plan (Merged column) */}
          <div className="lg:col-span-2 space-y-6">
            <DeviceCard />
            <AdviceBlock advice={advice} workout={workout} isGenerating={isGeneratingAdvice} />
            <YearlyStats />
            <TrainingPlan userContext={{ ...data, credentials }} language={settingsData?.language || 'en'} />
          </div>

          {/* Right: Activities */}
          <div className="lg:col-span-1">
            <ActivityList
              activities={metrics?.recent_activities || []}
              onSelect={setSelectedActivityId}
            />
          </div>
        </div>
      </div>

      {/* Activity Analysis Modal */}
      {selectedActivityId && (
        <ActivityAnalysis
          activityId={selectedActivityId}
          onClose={() => setSelectedActivityId(null)}
        />
      )}

      {/* Metric Detail Modal */}
      {selectedMetric && (
        <MetricDetailModal
          metricKey={selectedMetric.key}
          title={selectedMetric.title}
          unit={selectedMetric.unit}
          color={selectedMetric.color}
          onClose={() => setSelectedMetric(null)}
        />
      )}

      <ChatWidget userContext={{ health, sleep, metrics }} language={settingsData?.language || 'en'} />
    </div>
  );
}

export default App;
