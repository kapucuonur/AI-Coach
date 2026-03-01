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
import { Heart, Activity, Moon, Sun, Battery, Loader2, Settings, Zap, Clock, Home } from 'lucide-react';

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
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");

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
      setTrialEndsAt(res.data.trial_ends_at || null);
      setSubscriptionStatus(res.data.subscription_status || "inactive");
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
        setTrialEndsAt(res.data.trial_ends_at || null);
        setSubscriptionStatus(res.data.subscription_status || "inactive");
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
          <header className="flex flex-row justify-between items-center gap-3 py-1">
            {/* Left: Logo + Title */}
            <div
              className="cursor-pointer group flex items-center gap-3 shrink-0"
              onClick={() => window.location.href = '/'}
              title="Return to Main Page"
            >
              <div className="p-2 bg-garmin-blue/10 rounded-xl group-hover:bg-garmin-blue/20 transition-colors">
                <Home className="text-garmin-blue" size={24} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white group-hover:text-garmin-blue transition-colors leading-tight whitespace-nowrap">
                  CoachOnur AI
                </h1>
                <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {t('daily_intelligence')}
                </p>
              </div>
            </div>

            {/* Right: All Controls */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Premium / Admin Button */}
              {subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing' && (
                <button
                  onClick={() => setShowPaywall(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-emerald-500 text-white text-xs font-bold rounded-lg shadow hover:scale-[1.03] transition-transform active:scale-95"
                >
                  <Zap size={14} />
                  {isAdmin
                    ? "Admin"
                    : (trialEndsAt && new Date() < new Date(trialEndsAt)
                      ? `Pro (${Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))}d)`
                      : t('upgrade_button'))}
                </button>
              )}

              {/* Language */}
              <select
                value={settingsData?.language || i18n.language || 'en'}
                onChange={async (e) => {
                  const newLang = e.target.value;
                  i18n.changeLanguage(newLang);
                  if (settingsData) {
                    setSettingsData(prev => ({ ...prev, language: newLang }));
                  }
                  // Clear cached advice so it re-generates in the new language
                  setData(prev => prev ? { ...prev, advice: null, workout: null } : prev);
                  try {
                    await client.post('/settings', { language: newLang });
                  } catch (err) {
                    console.error("Failed to update language", err);
                  }
                  // Trigger fresh advice generation in the new language
                  fetchAIAdvice(null, newLang);
                }}
                className="bg-white dark:bg-garmin-gray text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-garmin-blue shadow-sm"
              >
                <option value="en">EN</option>
                <option value="tr">TR</option>
                <option value="de">DE</option>
                <option value="fr">FR</option>
                <option value="es">ES</option>
                <option value="it">IT</option>
                <option value="ru">RU</option>
                <option value="fi">FI</option>
              </select>

              {/* Sync */}
              <button
                onClick={() => fetchDashboardData()}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-garmin-blue hover:bg-blue-600 rounded-lg transition-colors shadow-sm disabled:opacity-50 text-xs font-medium"
                title={t('sync_garmin') || "Sync Garmin Data"}
              >
                <Activity size={14} className={loading && isGeneratingAdvice === false ? "animate-spin" : ""} />
                <span className="hidden md:inline">{t('sync_garmin') || "Sync"}</span>
              </button>

              {/* Dark mode */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-garmin-blue rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-garmin-gray transition-colors shadow-sm"
                title={darkMode ? t('switch_to_light_mode') : t('switch_to_dark_mode')}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Settings */}
              <button
                onClick={() => requirePremium(() => setIsSettingsOpen(true))}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-garmin-blue rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-garmin-gray transition-colors shadow-sm"
              >
                <Settings size={16} />
              </button>

              {/* Online + Logout group */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-1.5" title="Agent Online">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hidden lg:inline">{t('online')}</span>
                </div>
                <button
                  onClick={() => {
                    setIsAuthenticated(false);
                    localStorage.removeItem('access_token');
                    delete client.defaults.headers.common['Authorization'];
                  }}
                  className="text-xs font-bold px-2 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 uppercase tracking-wider transition-colors"
                >
                  {t('logout')}
                </button>
              </div>
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


          {/* Hero Banner - Animated CSS (no video required) */}
          <div className="relative w-full h-48 md:h-64 lg:h-72 rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{ background: 'linear-gradient(135deg, #0a0f2e 0%, #0d2137 30%, #061a2e 60%, #0a1628 100%)' }}>

            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-96 h-96 rounded-full opacity-20 animate-pulse"
                style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', top: '-80px', left: '-60px', animationDuration: '3s' }} />
              <div className="absolute w-72 h-72 rounded-full opacity-15 animate-pulse"
                style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', bottom: '-60px', right: '10%', animationDuration: '4s', animationDelay: '1s' }} />
              <div className="absolute w-48 h-48 rounded-full opacity-10 animate-pulse"
                style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', top: '10px', right: '30%', animationDuration: '5s', animationDelay: '2s' }} />
            </div>

            {/* Speed lines */}
            <div className="absolute inset-0 opacity-10">
              {[10, 25, 40, 55, 70, 85].map((top, i) => (
                <div key={i} className="absolute h-px"
                  style={{
                    top: `${top}%`, left: '0', right: '0',
                    background: `linear-gradient(90deg, transparent 0%, rgba(59,130,246,${0.3 + i * 0.05}) 40%, rgba(16,185,129,0.4) 70%, transparent 100%)`,
                    transform: `scaleX(${0.4 + i * 0.1})`, transformOrigin: 'left',
                    animation: `pulse ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.2}s`
                  }} />
              ))}
            </div>

            {/* Grid mesh overlay */}
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* Professional Cinematic Background Video */}
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
              poster="https://images.pexels.com/photos/3760259/pexels-photo-3760259.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
            >
              <source src="https://player.vimeo.com/external/403295268.sd.mp4?s=d7e7e6f6a73c52e4b553c457d1bc94541cb83bf9&profile_id=164&oauth2_token_id=57447761" type="video/mp4" />
            </video>
            {/* Floating sport keywords */}
            {[
              { word: 'VO2 Max', left: '62%', top: '12%', delay: '0s', dur: '4s', color: '#60a5fa' },
              { word: 'Training', left: '72%', top: '55%', delay: '1.2s', dur: '4.5s', color: '#34d399' },
              { word: 'HR', left: '55%', top: '30%', delay: '2.4s', dur: '3.5s', color: '#f87171' },
              { word: 'Pace', left: '82%', top: '20%', delay: '0.6s', dur: '5s', color: '#a78bfa' },
              { word: 'FTP', left: '68%', top: '70%', delay: '3s', dur: '4s', color: '#fbbf24' },
              { word: 'Cadence', left: '78%', top: '42%', delay: '1.8s', dur: '4.8s', color: '#60a5fa' },
              { word: 'Recovery', left: '58%', top: '62%', delay: '3.6s', dur: '5.2s', color: '#34d399' },
              { word: 'Power', left: '88%', top: '55%', delay: '2s', dur: '3.8s', color: '#f472b6' },
              { word: 'Heart', left: '52%', top: '45%', delay: '0.4s', dur: '4.2s', color: '#f87171' },
              { word: 'Zone 2', left: '75%', top: '78%', delay: '2.8s', dur: '4.6s', color: '#a78bfa' },
              { word: 'Threshold', left: '64%', top: '85%', delay: '1.5s', dur: '5.4s', color: '#fbbf24' },
              { word: 'TSS', left: '85%', top: '10%', delay: '4s', dur: '3.6s', color: '#60a5fa' },
              { word: 'Elevation', left: '70%', top: '30%', delay: '0.9s', dur: '4.3s', color: '#fb923c' },
            ].map(({ word, left, top, delay, dur, color }, i) => (
              <div key={i} className="absolute select-none pointer-events-none"
                style={{
                  left, top,
                  animation: `floatWord ${dur} ease-in-out infinite`,
                  animationDelay: delay,
                }}>
                <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border backdrop-blur-sm"
                  style={{
                    color,
                    borderColor: `${color}40`,
                    backgroundColor: `${color}15`,
                    textShadow: `0 0 8px ${color}`,
                  }}>
                  {word}
                </span>
              </div>
            ))}


            {/* Bottom gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050a14] via-[#050a14]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050a14]/80 via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full z-20">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-blue-400 font-bold tracking-wider uppercase text-xs">CoachOnur Pro</span>
                </div>
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5">
                  <span className="text-emerald-400 text-xs font-medium">AI Powered</span>
                </div>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-2" style={{ textShadow: '0 0 40px rgba(59,130,246,0.3)' }}>
                {t('ready_to_train') || "Sınırlarını zorlamaya hazır mısın?"}
              </h2>
              <p className="text-gray-400 md:text-base max-w-xl font-medium">
                {t('hero_subtitle') || "Günlük performans zekan ve yapay zeka koçluk raporun hazır."}
              </p>
            </div>
          </div>



          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
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

              <AdviceBlock advice={advice} workout={workout} isGenerating={isGeneratingAdvice} language={settingsData?.language || 'en'} />
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
