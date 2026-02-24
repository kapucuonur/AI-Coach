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
import { GarminConnectModal } from './components/GarminConnectModal';
import { PremiumPaywallModal } from './components/PremiumPaywallModal';
import { Heart, Activity, Moon, Sun, Battery, Loader2, Settings, Zap, Clock } from 'lucide-react';

function App() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [_error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [trainingHours, setTrainingHours] = useState("");
  const [trainingMinutes, setTrainingMinutes] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const ADMIN_EMAILS = ['kapucuonur@hotmail.com', 'onurbenn@gmail.com'];

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

  const [settingsData, setSettingsData] = useState(null);

  const fetchAIAdvice = async (forceMins = null, languageOverride = null) => {
    if (!isAuthenticated || !data) return;
    if (data.advice && forceMins === null && languageOverride === null) return; // Only skip if we already have advice AND we aren't forcing a regeneration

    setIsGeneratingAdvice(true);
    try {
      const payload = {
        todays_activities: data.todays_activities || [],
        activities_summary_dict: data.metrics?.weekly_volume || {},
        health_stats: data.metrics?.health || {},
        sleep_data: data.metrics?.sleep || {},
        profile: data.metrics?.profile || {},
        language: languageOverride || settingsData?.language || i18n.language || 'en'
      };

      if (forceMins !== null && forceMins > 0) {
        payload.available_time_mins = forceMins;
      }

      const res = await client.post('/coach/generate-advice', payload);

      setData(prev => ({
        ...prev,
        advice: res.data.advice,
        workout: res.data.workout
      }));
    } catch (err) {
      console.error("Failed to generate AI advice", err);
      setData(prev => ({
        ...prev,
        advice: "Sorry, I could not generate your advice right now. Please try again later.",
        workout: null
      }));
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  // Trigger AI generation AFTER dashboard data loads
  useEffect(() => {
    // Only fetch if authenticated, data exists, and advice hasn't been generated yet
    if (isAuthenticated && data && !data.advice) {
      fetchAIAdvice();
    }
  }, [isAuthenticated, data]);

  const handleManualGenerate = () => {
    requirePremium(() => {
      let totalMins = 0;
      if (trainingHours) totalMins += parseInt(trainingHours, 10) * 60;
      if (trainingMinutes) totalMins += parseInt(trainingMinutes, 10);
      fetchAIAdvice(totalMins > 0 ? totalMins : null);
    });
  };

  const requirePremium = (action) => {
    if (isPremium || isAdmin) {
      action();
    } else {
      setShowPaywall(true);
    }
  };

  const [showGarminConnectModal, setShowGarminConnectModal] = useState(false);

  // Helper to fetch all dashboard data once authenticated
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch daily metrics
      const response = await client.post('/coach/daily-metrics');
      let enrichedData = response.data;

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

      // Fetch profile data
      try {
        const profileRes = await client.get('/dashboard/profile');
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
    } catch (err) {
      console.error(err);
      if (err.response?.data?.detail === "GARMIN_NOT_CONNECTED") {
        setShowGarminConnectModal(true);
      } else {
        const msg = err.response?.data?.detail || "Could not fetch dashboard data.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (token, hasGarmin) => {
    if (token) {
      localStorage.setItem('access_token', token);
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    setIsAuthenticated(true);
    setLoading(true);

    try {
      // Fetch /me to ensure we have the correct premium & admin state on fresh login
      const res = await client.get('/auth/me');
      setIsPremium(res.data.is_premium || false);
      setIsAdmin(ADMIN_EMAILS.includes(res.data.email));
    } catch (e) {
      console.error("Failed to fetch user state format during login", e);
    }

    if (hasGarmin) {
      await fetchDashboardData();
    } else {
      setShowGarminConnectModal(true);
      setLoading(false);
    }
  };

  // If we have a token on load, try to authenticate instantly
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Optimistically log in
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      client.get('/auth/me').then(res => {
        setIsAuthenticated(true);
        setIsPremium(res.data.is_premium || false);
        setIsAdmin(ADMIN_EMAILS.includes(res.data.email));
        if (res.data.has_garmin_connected) {
          fetchDashboardData();
        } else {
          setShowGarminConnectModal(true);
        }
      }).catch(() => {
        localStorage.removeItem('access_token');
        delete client.defaults.headers.common['Authorization'];
      });
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-garmin-dark transition-colors duration-300">
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-garmin-blue dark:hover:text-white rounded-full transition-colors"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
        <Login onLogin={handleLogin} />
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
    <>
      <div className={`min-h-screen bg-gray-50 dark:bg-garmin-dark text-gray-900 dark:text-white p-4 md:p-8 transition-colors duration-300 ${showGarminConnectModal ? 'blur-md pointer-events-none select-none' : ''}`}>
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('dashboard_title')}</h1>
              <p className="text-gray-500 dark:text-gray-400">{t('daily_intelligence')}</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={settingsData?.language || i18n.language || 'en'}
                onChange={async (e) => {
                  const newLang = e.target.value;
                  i18n.changeLanguage(newLang);
                  if (settingsData) {
                    setSettingsData(prev => ({ ...prev, language: newLang }));
                  }
                  try {
                    await client.post('/settings', { language: newLang });
                    // Immediately fetch new advice with updated language
                    fetchAIAdvice(null, newLang);
                  } catch (err) {
                    console.error("Failed to update language", err);
                  }
                }}
                className="bg-white dark:bg-garmin-gray text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-garmin-blue shadow-sm"
              >
                <option value="en">EN</option>
                <option value="tr">TR</option>
                <option value="de">DE</option>
                <option value="fr">FR</option>
                <option value="es">ES</option>
                <option value="it">IT</option>
                <option value="ru">RU</option>
              </select>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-garmin-blue dark:hover:text-white rounded-full transition-colors bg-white dark:bg-transparent border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none"
                title={darkMode ? t('switch_to_light_mode') : t('switch_to_dark_mode')}
              >
                {darkMode ? (
                  <div className="flex items-center gap-2"><span>{t('light')}</span> <Sun size={24} /></div>
                ) : (
                  <div className="flex items-center gap-2"><span>{t('dark')}</span> <Moon size={24} /></div>
                )}
              </button>

              <button
                onClick={() => requirePremium(() => setIsSettingsOpen(true))}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-garmin-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <Settings size={24} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('online')}</span>
              </div>

              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  localStorage.removeItem('access_token');
                  delete client.defaults.headers.common['Authorization'];
                }}
                className="text-sm text-red-500 hover:text-red-400 ml-2"
              >
                {t('logout')}
              </button>
            </div>
          </header>

          {/* Admin Banner */}
          {isAdmin && (
            <div className="bg-garmin-blue/20 border border-garmin-blue text-garmin-blue-dark dark:text-blue-200 px-4 py-3 rounded-xl flex items-center justify-between">
              <span className="font-semibold">🚀 {t('admin_mode')}</span>
              <span className="text-sm opacity-80">{t('admin_mode_desc')}</span>
            </div>
          )}

          {/* Premium Upgrade Banner (Top of page) */}
          {!isPremium && (
            <div className="bg-gradient-to-r from-blue-600/10 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-sm -mt-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="text-emerald-500" /> {t('upgrade_title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1 max-w-xl">
                  {t('upgrade_desc')}
                </p>
              </div>
              <button
                onClick={() => setShowPaywall(true)}
                className="group w-full sm:w-auto flex-shrink-0 relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 px-8 py-4 font-bold text-lg text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-emerald-500/25 active:scale-[0.98]"
              >
                {t('upgrade_button')}
              </button>
            </div>
          )}

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

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <StatsCard
              title={t('resting_hr')}
              value={health.restingHeartRate || '--'}
              unit={t('bpm')}
              icon={Heart}
              className="border-red-500/20 cursor-pointer transition-transform hover:scale-105"
              onClick={() => requirePremium(() => setSelectedMetric({ key: 'resting_hr', title: t('resting_hr'), unit: t('bpm'), color: '#ef4444' }))}
            />
            <StatsCard
              title={t('vo2_max')}
              value={profile.vo2Max || profile.vo2MaxValue || profile.vo2MaxRunning || profile.vo2MaxPrecise || '--'}
              unit="ml/kg"
              icon={Zap}
              className="border-yellow-500/20 cursor-pointer transition-transform hover:scale-105"
              onClick={() => requirePremium(() => setSelectedMetric({ key: 'vo2_max', title: t('vo2_max'), unit: 'ml/kg', color: '#eab308' }))}
            />
            <StatsCard
              title={t('stress')}
              value={health.averageStressLevel || '--'}
              unit="/100"
              icon={Activity}
              className="border-orange-500/20 cursor-pointer transition-transform hover:scale-105"
              onClick={() => requirePremium(() => setSelectedMetric({ key: 'stress', title: t('stress'), unit: '', color: '#f97316' }))}
            />
            <StatsCard
              title={t('body_battery')}
              value={health.bodyBatteryMostRecentValue || '--'}
              unit="%"
              icon={Battery}
              className="border-blue-500/20 cursor-pointer transition-transform hover:scale-105"
              onClick={() => requirePremium(() => setSelectedMetric({ key: 'body_battery', title: t('body_battery'), unit: '%', color: '#3b82f6' }))}
            />
            <StatsCard
              title={t('sleep')}
              value={sleep.dailySleepDTO?.sleepTimeSeconds ? (sleep.dailySleepDTO.sleepTimeSeconds / 3600).toFixed(1) : '--'}
              unit={t('hrs')}
              icon={Moon}
              className="border-purple-500/20 cursor-pointer transition-transform hover:scale-105"
              onClick={() => requirePremium(() => setSelectedMetric({ key: 'sleep', title: t('sleep'), unit: t('hrs'), color: '#a855f7' }))}
            />
            <StatsCard
              title={t('fitness_age')}
              value={profile.fitnessAge ? Number(profile.fitnessAge).toFixed(1) : '--'}
              unit={t('yrs')}
              icon={Zap}
              className="border-green-500/20 cursor-pointer transition-transform hover:scale-105"
              onClick={() => requirePremium(() => setSelectedMetric({ key: 'fitness_age', title: t('fitness_age'), unit: t('yrs'), color: '#22c55e' }))}
            />
          </div>

          {/* Nutrition Tracking */}
          <NutritionTracker />

          {/* Main Content Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left: Coach Advice & Plan */}
            <div className="lg:col-span-2 space-y-6">
              <DeviceCard />

              {/* Daily Training Time Configuration */}
              <div className="bg-white dark:bg-garmin-card rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock size={20} className="text-garmin-blue" />
                    {t('daily_training_time') || "Daily Training Time"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('daily_training_desc') || "How much time do you have to train today?"}
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Hrs"
                      value={trainingHours}
                      onChange={(e) => setTrainingHours(e.target.value)}
                      className="w-16 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg p-2 text-center text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                    />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">h</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Min"
                      value={trainingMinutes}
                      onChange={(e) => setTrainingMinutes(e.target.value)}
                      className="w-16 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg p-2 text-center text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                    />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">m</span>
                  </div>
                  <button
                    onClick={handleManualGenerate}
                    disabled={isGeneratingAdvice}
                    className="px-4 py-2 bg-garmin-blue hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGeneratingAdvice ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    {t('update_plan') || "Update Plan"}
                  </button>
                </div>
              </div>

              <AdviceBlock advice={advice} workout={workout} isGenerating={isGeneratingAdvice} />
              <YearlyStats />
              <div className="relative">
                {/* Blur Overlay for Free Users */}
                {!isPremium && !isAdmin && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/10 dark:bg-black/20 backdrop-blur-md">
                    <div className="bg-white/80 dark:bg-black/60 backdrop-blur-lg px-6 py-4 rounded-xl border border-gray-200 dark:border-gray-800 text-center shadow-xl">
                      <div className="mx-auto w-12 h-12 bg-emerald-500/20 text-emerald-500 flex items-center justify-center rounded-full mb-3">
                        <Zap className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('premium_feature')}</h3>
                      <p className="text-sm text-gray-500 mt-1 mb-4">{t('premium_feature_desc')}</p>
                      <button
                        onClick={() => setShowPaywall(true)}
                        className="text-sm font-semibold text-white bg-garmin-blue hover:bg-garmin-blue-light transition-colors px-6 py-2 rounded-lg"
                      >
                        {t('unlock_now')}
                      </button>
                    </div>
                  </div>
                )}

                <div className={!isPremium && !isAdmin ? "opacity-30 pointer-events-none select-none" : ""}>
                  <TrainingPlan userContext={{ ...data }} language={settingsData?.language || 'en'} />
                </div>
              </div>
            </div>

            {/* Right: Activities */}
            <div className="lg:col-span-1 cursor-pointer" onClick={() => requirePremium(() => { })}>
              {/* Note: The ActivityList is made unclickable inside by wrapping the wrapper */}
              <div className={!isPremium && !isAdmin ? "pointer-events-none" : ""}>
                <ActivityList
                  activities={metrics?.recent_activities || []}
                  onSelect={(id) => requirePremium(() => setSelectedActivityId(id))}
                />
              </div>
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

        {/* Only show ChatWidget if Premium or Admin */}
        {(isPremium || isAdmin) && (
          <ChatWidget userContext={{ health, sleep, metrics }} language={settingsData?.language || 'en'} />
        )}
      </div>

      <PremiumPaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
      />

      {showGarminConnectModal && (
        <GarminConnectModal
          onConnected={() => {
            setShowGarminConnectModal(false);
            fetchDashboardData();
          }}
        />
      )}
    </>
  );
}

export default App;
