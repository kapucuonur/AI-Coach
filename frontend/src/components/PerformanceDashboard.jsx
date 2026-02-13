import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import axiosClient from '../api/client'; // Assuming default export or similar
import './PerformanceDashboard.css';

const PerformanceDashboard = () => {
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

    useEffect(() => {
        fetchDashboard();
        // Mock data fetching for metrics/activities - in real app would come from API
        // For now using user's mock values from Vue component
        setRecentActivities([
            { id: 1, type: 'running', name: 'Morning Run', distance: 5000, duration: 1800, avg_hr: 145, load: 45 },
            { id: 2, type: 'cycling', name: 'Evening Ride', distance: 20000, duration: 3600, avg_hr: 130, load: 60 },
            { id: 3, type: 'strength', name: 'Gym Session', distance: 0, duration: 2700, avg_hr: 110, load: 30 },
            { id: 4, type: 'running', name: 'Intervals', distance: 8000, duration: 2400, avg_hr: 165, load: 120 },
        ]);
    }, [days]);

    useEffect(() => {
        // Initialize charts when component mounts or updates
        // We need a slight delay to ensure canvas is rendered
        if (!loading) {
            initCharts();
        }
        return () => {
            // Cleanup charts
            Object.values(chartInstances.current).forEach(chart => chart.destroy());
        };
    }, [loading]);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/charts/dashboard?days=${days}`);
            if (response.data && response.data.chart) {
                setDashboardChart(`data:image/png;base64,${response.data.chart}`);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
            setLoading(false);
        }
    };

    const viewActivity = async (activityId) => {
        try {
            const response = await axiosClient.get(`/charts/activity/${activityId}`);
            setActivityChart(`data:image/png;base64,${response.data.chart}`);
            // TODO: Open modal or similar
            alert("Activity chart fetched (see console/network for now, modal TODO)");
        } catch (error) {
            console.error('Failed to fetch activity:', error);
        }
    };

    const initCharts = () => {
        // Cleanup old charts
        Object.values(chartInstances.current).forEach(chart => chart.destroy());

        // 1. Recovery Chart
        if (recoveryChartRef.current) {
            const ctx = recoveryChartRef.current.getContext('2d');
            chartInstances.current.recovery = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Body Battery',
                        data: [85, 78, 92, 88, 75, 95, 90],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.4
                    }, {
                        label: 'Stress',
                        data: [25, 35, 20, 28, 42, 18, 22],
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // 2. Sleep Chart
        if (sleepChartRef.current) {
            const ctx = sleepChartRef.current.getContext('2d');
            chartInstances.current.sleep = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Sleep Score',
                        data: [78, 85, 72, 88, 91, 95, 82],
                        backgroundColor: [
                            '#ffcc80', '#81c784', '#ff8a65',
                            '#81c784', '#66bb6a', '#4caf50', '#81c784'
                        ]
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
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [{
                        label: 'Resting HR',
                        data: [48, 47, 46, 45],
                        borderColor: 'rgb(239, 83, 80)',
                        yAxisID: 'y'
                    }, {
                        label: 'HRV',
                        data: [125, 128, 132, 135],
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

        // 4. Weekly Chart
        if (weeklyChartRef.current) {
            const ctx = weeklyChartRef.current.getContext('2d');
            chartInstances.current.weekly = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Running', 'Cycling', 'Swimming', 'Strength'],
                    datasets: [{
                        data: [45, 30, 15, 10],
                        backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24']
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
                        <div key={activity.id} className="activity-item" onClick={() => viewActivity(activity.id)}>
                            <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                            <div className="activity-info">
                                <div className="activity-name">{activity.name}</div>
                                <div className="activity-stats">
                                    {formatDistance(activity.distance)} • {formatDuration(activity.duration)} • {activity.avg_hr} bpm
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
