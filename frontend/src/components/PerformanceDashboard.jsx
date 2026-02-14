import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import axiosClient from '../api/client'; // Assuming default export or similar
import './PerformanceDashboard.css';

const PerformanceDashboard = ({ onActivitySelect }) => {
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [dashboardChart, setDashboardChart] = useState(null);
    const [activityChart, setActivityChart] = useState(null);
    const [metrics, setMetrics] = useState({
        recovery_score: 85,
        recovery_trend: '+5%',
        ctl: 45,
        ctl_change: 2,
        atl: 38,
        sleep_avg: 82,
        sleep_trend: 'Stable'
    });
    const [recentActivities, setRecentActivities] = useState([]);

    // Chart Refs
    const recoveryChartRef = useRef(null);
    const sleepChartRef = useRef(null);
    const hrChartRef = useRef(null);
    const weeklyChartRef = useRef(null);

    // Instance Refs to destroy charts
    const chartInstances = useRef({});

    // Data State
    const [healthData, setHealthData] = useState([]);

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchDashboard(),
                    fetchActivities(),
                    fetchHealthData()
                ]);
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, [days]);

    useEffect(() => {
        if (!loading && healthData.length > 0) {
            initCharts();
        }
        return () => {
            Object.values(chartInstances.current).forEach(chart => chart?.destroy());
        };
    }, [loading, healthData]);

    const fetchDashboard = async () => {
        try {
            const response = await axiosClient.get(`/charts/dashboard?days=${days}`);
            if (response.data && response.data.chart) {
                setDashboardChart(`data:image/png;base64,${response.data.chart}`);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard chart:', error);
        }
    };

    const fetchActivities = async () => {
        try {
            // Fetch more activities for larger date ranges to fill the list
            const limit = days > 7 ? 20 : 10;
            const response = await axiosClient.get(`/dashboard/activities?limit=${limit}`);
            if (response.data) {
                // Transform Garmin activity data to our frontend model
                const mapped = response.data.map(act => ({
                    id: act.activityId,
                    type: act.activityType.typeKey || 'other',
                    name: act.activityName,
                    distance: act.distance,
                    duration: act.duration,
                    avg_hr: act.averageHR || 0,
                    load: Math.round(act.averageHR * (act.duration / 3600)) // Crude TSS est if missing
                }));
                setRecentActivities(mapped);
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        }
    };

    const fetchHealthData = async () => {
        try {
            const response = await axiosClient.get(`/charts/data/health?days=${days}`);
            if (response.data) {
                setHealthData(response.data);

                // Update summary metrics from latest data point
                if (response.data.length > 0) {
                    const latest = response.data[response.data.length - 1];
                    // Calculate trends (simple comparison with previous if exists)
                    const prev = response.data.length > 1 ? response.data[response.data.length - 2] : latest;

                    setMetrics({
                        recovery_score: latest.body_battery || 0, // Using Body Battery as proxy for recovery score
                        recovery_trend: latest.body_battery >= prev.body_battery ? 'Stable' : 'Declining',
                        ctl: 0, // Need dedicated endpoint for these TSS metrics
                        ctl_change: 0,
                        atl: 0,
                        sleep_avg: Math.round(response.data.reduce((acc, curr) => acc + (curr.sleep_score || 0), 0) / response.data.length),
                        sleep_trend: 'Stable'
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch health data:', error);
        }
    };

    const initCharts = () => {
        // Cleanup old charts
        Object.values(chartInstances.current).forEach(chart => chart?.destroy());

        if (healthData.length === 0) return;

        const labels = healthData.map(d => new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }));
        const sleepScores = healthData.map(d => d.sleep_score || 0);
        const bodyBattery = healthData.map(d => d.body_battery || 0);
        const stressScores = healthData.map(d => d.stress_score || 0);
        const rhr = healthData.map(d => d.resting_hr || 0);
        const hrv = healthData.map(d => d.hrv || 0);

        // 1. Recovery Chart (Body Battery vs Stress)
        if (recoveryChartRef.current) {
            const ctx = recoveryChartRef.current.getContext('2d');
            chartInstances.current.recovery = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Body Battery',
                        data: bodyBattery,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.4,
                        yAxisID: 'y'
                    }, {
                        label: 'Stress',
                        data: stressScores,
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.4,
                        yAxisID: 'y'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { min: 0, max: 100 } }
                }
            });
        }

        // 2. Sleep Chart
        if (sleepChartRef.current) {
            const ctx = sleepChartRef.current.getContext('2d');
            chartInstances.current.sleep = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Sleep Score',
                        data: sleepScores,
                        backgroundColor: sleepScores.map(s => s >= 80 ? '#4caf50' : s >= 60 ? '#ff9800' : '#f44336')
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { min: 0, max: 100 } }
                }
            });
        }

        // 3. HR Chart
        if (hrChartRef.current) {
            const ctx = hrChartRef.current.getContext('2d');
            chartInstances.current.hr = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Resting HR',
                        data: rhr,
                        borderColor: 'rgb(239, 83, 80)',
                        yAxisID: 'y'
                    }, {
                        label: 'HRV',
                        data: hrv,
                        borderColor: 'rgb(126, 87, 194)',
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { type: 'linear', display: true, position: 'left' },
                        y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
                    }
                }
            });
        }

        // 4. Weekly Chart (Activity Counts) (Simplified for now based on recent activities list logic if we had full history)
        // For now, keep mock or remove? Let's hide it if no data or keep simplified.
        if (weeklyChartRef.current) {
            // We can calculate this from fetched activities if we fetch enough
            const typeCounts = recentActivities.reduce((acc, curr) => {
                acc[curr.type] = (acc[curr.type] || 0) + 1;
                return acc;
            }, {});

            const ctx = weeklyChartRef.current.getContext('2d');
            chartInstances.current.weekly = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(typeCounts).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
                    datasets: [{
                        data: Object.values(typeCounts),
                        backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#a55eea']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    };

    const getRecoveryClass = () => {
        if (metrics.recovery_score >= 80) return 'good';
        if (metrics.recovery_score >= 60) return 'moderate';
        return 'poor';
    };

    const getActivityIcon = (type) => {
        const icons = {
            running: '🏃',
            cycling: '🚴',
            swimming: '🏊',
            strength: '🏋️',
            yoga: '🧘'
        };
        return icons[type] || '⚡';
    };

    const formatDistance = (meters) => (meters / 1000).toFixed(2) + ' km';
    const formatDuration = (seconds) => Math.floor(seconds / 60) + ' min';
    const getLoadColor = (load) => {
        if (load > 200) return '#ff4444';
        if (load > 100) return '#ffaa00';
        return '#44ff44';
    };

    return (
        <div className="coach-dashboard">
            <header className="dashboard-header">
                <h1>🏃‍♂️ Coach-AI Performance Center</h1>
                <div className="date-range">
                    <button onClick={() => setDays(7)} className={days === 7 ? 'active' : ''}>7 Days</button>
                    <button onClick={() => setDays(30)} className={days === 30 ? 'active' : ''}>30 Days</button>
                    <button onClick={() => setDays(90)} className={days === 90 ? 'active' : ''}>3 Months</button>
                </div>
            </header>

            <div className="metrics-grid">
                <div className={`metric-card ${getRecoveryClass()}`}>
                    <div className="metric-icon">❤️</div>
                    <div className="metric-value">{metrics.recovery_score}</div>
                    <div className="metric-label">Recovery Score</div>
                    <div className="metric-trend">{metrics.recovery_trend}</div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">⚡</div>
                    <div className="metric-value">{metrics.ctl}</div>
                    <div className="metric-label">Fitness (CTL)</div>
                    <div className="metric-trend up">+ {metrics.ctl_change}</div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">🔥</div>
                    <div className="metric-value">{metrics.atl}</div>
                    <div className="metric-label">Fatigue (ATL)</div>
                    <div className={`metric-trend ${metrics.atl > metrics.ctl ? 'warning' : ''}`}>
                        {metrics.atl > metrics.ctl ? 'High' : 'Normal'}
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">😴</div>
                    <div className="metric-value">{metrics.sleep_avg}</div>
                    <div className="metric-label">Avg Sleep</div>
                    <div className="metric-trend">{metrics.sleep_trend}</div>
                </div>
            </div>

            <div className="charts-container">
                <div className="chart-box large">
                    <h3>Training Load & Fitness Trend</h3>
                    {loading ? (
                        <div className="loading-container">Generating detailed analysis...</div>
                    ) : (
                        dashboardChart && <img src={dashboardChart} alt="Performance Dashboard" />
                    )}
                </div>

                <div className="charts-grid">
                    <div className="chart-box">
                        <h3>Recovery Status</h3>
                        <canvas ref={recoveryChartRef}></canvas>
                    </div>

                    <div className="chart-box">
                        <h3>Sleep Analysis</h3>
                        <canvas ref={sleepChartRef}></canvas>
                    </div>

                    <div className="chart-box">
                        <h3>Heart Rate Trends</h3>
                        <canvas ref={hrChartRef}></canvas>
                    </div>

                    <div className="chart-box">
                        <h3>Weekly Summary</h3>
                        <canvas ref={weeklyChartRef}></canvas>
                    </div>
                </div>
            </div>

            <div className="activities-section">
                <h3>Recent Activities</h3>
                <div className="activity-list">
                    {recentActivities.map(activity => (
                        <div key={activity.id} className="activity-item" onClick={() => onActivitySelect && onActivitySelect(activity.id)}>
                            <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                            <div className="activity-info">
                                <div className="activity-name">{activity.name}</div>
                                <div className="activity-stats">
                                    {formatDistance(activity.distance || 0)} • {formatDuration(activity.duration || 0)} • {activity.avg_hr || 0} bpm
                                </div>
                            </div>
                            <div className="activity-load" style={{ background: getLoadColor(activity.load) }}>
                                {activity.load} TSS
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PerformanceDashboard;
