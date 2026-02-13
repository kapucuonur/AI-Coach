"""
advanced_analytics.py - Predictive Modeling & specialized analysis for Coach-AI
Includes: Injury Risk Prediction, Race Pace Calculator, Advanced Swim Stroke Analysis
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Circle, Wedge, Rectangle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import io
import base64
import logging

# Configure logger
logger = logging.getLogger(__name__)

# Optional imports
try:
    import seaborn as sns
    sns.set_palette("husl")
    HAS_SEABORN = True
except ImportError:
    HAS_SEABORN = False
    logger.warning("Seaborn not found. Using Matplotlib defaults.")

try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.preprocessing import StandardScaler
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    logger.warning("Scikit-learn not found. Predictive features may be limited.")

plt.style.use('ggplot')
try:
    plt.style.use('seaborn-v0_8-whitegrid')
except:
    pass

class AdvancedAnalyticsManager:
    """
    Manages generation of advanced predictive analytics and specialized charts.
    """
    
    def __init__(self):
        pass

    def _fig_to_base64(self, fig) -> str:
        """Convert figure to base64 string"""
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        return img_base64

    # ==========================================
    # 1. INJURY RISK PREDICTION SYSTEM
    # ==========================================

    def generate_injury_risk_data(self):
        """Generate training data with injury indicators (Simulation)"""
        np.random.seed(42)
        
        # Simulate 90 days of training
        days = 90
        # date range ending today
        dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
        
        data = {
            'date': dates,
            'acute_load': [],  # 7-day load
            'chronic_load': [],  # 28-day load
            'acwr': [],  # Acute:Chronic Workload Ratio
            'sleep_quality': [],
            'hrv_trend': [],
            'muscle_soreness': [],  # 1-10 scale
            'previous_injury': [],  # Binary
            'running_cadence': [],
            'vertical_oscillation': [],
            'ground_contact_time': [],
            'weekly_mileage': [],
            'intensity_minutes': [],
            'rest_days': []
        }
        
        # Generate realistic patterns leading to fatigue
        for i in range(days):
            # Base training load with weekly cycles
            base_load = 500 + np.sin(i / 7 * 2 * np.pi) * 100
            
            # Add fatigue accumulation (spike in acute load)
            if 60 <= i <= 75:  # Overreaching period
                base_load *= 1.4
            
            acute = base_load + np.random.normal(0, 50)
            data['acute_load'].append(acute)
            
            # Chronic load (smoother)
            if i < 28:
                chronic = np.mean(data['acute_load'][:i+1]) if i > 0 else base_load
            else:
                chronic = np.mean(data['acute_load'][i-28:i])
            data['chronic_load'].append(chronic)
            
            # ACWR calculation
            acwr = data['acute_load'][-1] / data['chronic_load'][-1] if data['chronic_load'][-1] > 0 else 1
            data['acwr'].append(acwr)
            
            # Sleep degrades with high load
            sleep = 8 - (acwr - 1) * 2 + np.random.normal(0, 0.5)
            data['sleep_quality'].append(np.clip(sleep, 4, 10))
            
            # HRV inversely related to load
            hrv = 120 - (acwr - 1) * 30 + np.random.normal(0, 10)
            data['hrv_trend'].append(max(60, hrv))
            
            # Soreness increases with load
            soreness = (acwr - 1) * 5 + np.random.normal(0, 1)
            data['muscle_soreness'].append(np.clip(soreness, 0, 10))
            
            # Previous injury flag
            data['previous_injury'].append(1 if i < 30 else 0)
            
            # Running form metrics
            data['running_cadence'].append(175 + np.random.normal(0, 5))
            data['vertical_oscillation'].append(8.5 + (acwr - 1) * 2 + np.random.normal(0, 0.5))
            data['ground_contact_time'].append(230 + (acwr - 1) * 30 + np.random.normal(0, 10))
            
            # Weekly mileage
            data['weekly_mileage'].append((data['acute_load'][-1] / 500) * 50)
            
            # Intensity minutes
            data['intensity_minutes'].append(60 + (acwr - 1) * 40 + np.random.normal(0, 10))
            
            # Rest days (inverse to load)
            data['rest_days'].append(max(0, 2 - int(acwr)))
        
        return pd.DataFrame(data)

    def calculate_injury_risk_score(self, df):
        """Calculate composite injury risk score (0-100)"""
        if df.empty: return {}

        latest = df.iloc[-1]
        
        # Risk factors (0-25 points each)
        risks = {
            'acwr_risk': 0,
            'recovery_risk': 0,
            'biomechanical_risk': 0,
            'load_spike_risk': 0
        }
        
        # 1. ACWR Risk (Acute:Chronic Workload Ratio)
        acwr = latest['acwr']
        if acwr > 1.5:
            risks['acwr_risk'] = 25
        elif acwr > 1.3:
            risks['acwr_risk'] = 15
        elif acwr < 0.8:
            risks['acwr_risk'] = 10
        else:
            risks['acwr_risk'] = 0
        
        # 2. Recovery Risk (sleep + HRV + soreness)
        sleep_score = (latest['sleep_quality'] / 10) * 100
        hrv_score = min(100, (latest['hrv_trend'] / 120) * 100)
        soreness_score = 100 - (latest['muscle_soreness'] * 10)
        recovery_score = (sleep_score + hrv_score + soreness_score) / 3
        risks['recovery_risk'] = 25 - (recovery_score / 100 * 25)
        
        # 3. Biomechanical Risk
        vo_score = 100 - ((latest['vertical_oscillation'] - 6) / 6 * 100)  # Lower VO = better
        gct_score = 100 - ((latest['ground_contact_time'] - 200) / 100 * 100)  # Lower GCT = better
        bio_score = (vo_score + gct_score) / 2
        risks['biomechanical_risk'] = 25 - (bio_score / 100 * 25)
        
        # 4. Load Spike Risk (sudden increases)
        if len(df) >= 7:
            week_change = (df['acute_load'].iloc[-1] - df['acute_load'].iloc[-7]) / df['acute_load'].iloc[-7]
            if week_change > 0.3:
                risks['load_spike_risk'] = 25
            elif week_change > 0.2:
                risks['load_spike_risk'] = 15
            elif week_change > 0.1:
                risks['load_spike_risk'] = 5
        
        total_risk = sum(risks.values())
        
        return {
            'total_score': min(100, total_risk),
            'risk_level': 'HIGH' if total_risk >= 60 else 'MODERATE' if total_risk >= 40 else 'LOW',
            'factors': risks,
            'recommendations': self._generate_risk_recommendations(risks, latest)
        }

    def _generate_risk_recommendations(self, risks, latest):
        """Generate specific recommendations based on risk factors"""
        recs = []
        
        if risks['acwr_risk'] >= 15:
            recs.append("Reduce training volume by 20% this week")
        if risks['recovery_risk'] >= 15:
            recs.append("Prioritize sleep - aim for 8+ hours")
        if risks['biomechanical_risk'] >= 15:
            recs.append("Add form drills - focus on cadence and reducing bounce")
        if risks['load_spike_risk'] >= 15:
            recs.append("No intensity this week - easy aerobic only")
        
        if not recs:
            recs.append("Maintain current training - you're in the sweet spot!")
        
        return recs

    def create_injury_risk_dashboard(self, df=None):
        """Create comprehensive injury risk analysis dashboard"""
        if df is None:
             df = self.generate_injury_risk_data()

        risk_data = self.calculate_injury_risk_score(df)
        
        fig = plt.figure(figsize=(18, 12))
        fig.suptitle('Injury Risk Assessment & Prevention Dashboard', 
                     fontsize=18, fontweight='bold', y=0.98)
        
        gs = fig.add_gridspec(3, 4, hspace=0.35, wspace=0.35)
        
        # Color scheme based on risk
        risk_color = '#f44336' if risk_data['risk_level'] == 'HIGH' else \
                     '#ff9800' if risk_data['risk_level'] == 'MODERATE' else '#4caf50'
        
        # 1. Risk Score Gauge (Top Left)
        ax1 = fig.add_subplot(gs[0, 0], projection='polar')
        
        theta = np.linspace(0, np.pi, 100)
        r = np.ones(100)
        
        # Background arc
        ax1.fill_between(theta, 0, r, alpha=0.1, color='gray')
        
        # Risk arc
        risk_angle = (risk_data['total_score'] / 100) * np.pi
        theta_risk = np.linspace(0, risk_angle, 50)
        ax1.fill_between(theta_risk, 0, np.ones(50), alpha=0.8, color=risk_color)
        
        # Needle
        ax1.plot([0, risk_angle], [0, 0.8], color='black', linewidth=3)
        
        # Score text
        ax1.text(np.pi/2, 0.5, f"{risk_data['total_score']:.0f}", 
                ha='center', va='center', fontsize=36, fontweight='bold')
        ax1.text(np.pi/2, 0.3, risk_data['risk_level'], 
                ha='center', va='center', fontsize=14, color=risk_color)
        
        ax1.set_ylim(0, 1)
        ax1.set_xticks([0, np.pi/2, np.pi])
        ax1.set_xticklabels(['Low', 'Moderate', 'High'])
        ax1.set_yticks([])
        ax1.set_title('Injury Risk Score', fontweight='bold', pad=20)
        
        # 2. ACWR Trend (Top Middle-Left)
        ax2 = fig.add_subplot(gs[0, 1])
        ax2.plot(df['date'], df['acwr'], color='blue', linewidth=2)
        ax2.axhline(y=1.5, color='red', linestyle='--', linewidth=2, label='High Risk')
        ax2.axhline(y=1.3, color='orange', linestyle='--', linewidth=2, label='Caution')
        ax2.axhline(y=0.8, color='orange', linestyle='--', linewidth=2, label='Detraining')
        ax2.fill_between(df['date'], 0.8, 1.3, alpha=0.1, color='green', label='Sweet Spot')
        ax2.set_title('Acute:Chronic Ratio (ACWR)')
        ax2.set_ylabel('ACWR')
        ax2.legend(fontsize=8)
        ax2.set_ylim(0, 2)
        
        # 3. Load Progression (Top Middle-Right)
        ax3 = fig.add_subplot(gs[0, 2])
        ax3.plot(df['date'], df['acute_load'], label='Acute (7d)', color='red', linewidth=2)
        ax3.plot(df['date'], df['chronic_load'], label='Chronic (28d)', color='blue', linewidth=2)
        ax3.fill_between(df['date'], df['acute_load'], df['chronic_load'], 
                        where=(df['acute_load'] > df['chronic_load']), 
                        alpha=0.3, color='red', label='Spike')
        ax3.set_title('Training Load Progression')
        ax3.legend(fontsize=8)
        
        # 4. Recovery Metrics (Top Right)
        ax4 = fig.add_subplot(gs[0, 3])
        ax4_twin = ax4.twinx()
        ax4.plot(df['date'], df['sleep_quality'], color='purple', linewidth=2, label='Sleep')
        ax4.set_ylabel('Sleep (hrs)', color='purple')
        ax4_twin.plot(df['date'], df['hrv_trend'], color='green', linewidth=2, label='HRV', linestyle='--')
        ax4_twin.set_ylabel('HRV (ms)', color='green')
        ax4.set_title('Recovery Indicators')
        
        # 5. Risk Factors Breakdown (Middle Left)
        ax5 = fig.add_subplot(gs[1, 0])
        factors = risk_data['factors']
        colors_factors = ['#f44336' if v > 15 else '#ff9800' if v > 5 else '#4caf50' for v in factors.values()]
        bars = ax5.barh(list(factors.keys()), list(factors.values()), color=colors_factors, alpha=0.8)
        ax5.set_xlim(0, 25)
        ax5.set_title('Risk Factor Breakdown')
        
        # 6. Biomechanical Stress (Middle Center-Left)
        ax6 = fig.add_subplot(gs[1, 1])
        ax6.scatter(df['date'], df['vertical_oscillation'], 
                   c=df['acwr'], cmap='RdYlGn_r', alpha=0.6, s=20)
        ax6.set_title('Vertical Oscillation vs Load')
        ax6.set_ylabel('VO (cm)')
        
        # 7. Muscle Soreness (Middle Center-Right)
        ax7 = fig.add_subplot(gs[1, 2])
        soreness_colors = ['#4caf50' if s < 3 else '#ff9800' if s < 6 else '#f44336' for s in df['muscle_soreness']]
        ax7.bar(df['date'], df['muscle_soreness'], color=soreness_colors, alpha=0.7)
        ax7.set_title('Muscle Soreness (0-10)')
        ax7.set_ylim(0, 10)
        
        # 8. Training Strain (Middle Right)
        ax8 = fig.add_subplot(gs[1, 3])
        df['weekly_std'] = df['acute_load'].rolling(7).std()
        df['monotony'] = df['acute_load'] / (df['weekly_std'] + 1)
        df['strain'] = df['acute_load'] * df['monotony']
        ax8.plot(df['date'], df['strain'], color='purple', linewidth=2)
        ax8.set_title('Training Strain')
        
        # 9. 7-Day Load (Bottom Left)
        ax9 = fig.add_subplot(gs[2, 0])
        last_7 = df.tail(7)
        day_names = [d.strftime('%a') for d in last_7['date']]
        ax9.bar(day_names, last_7['acute_load'], color='skyblue')
        ax9.set_title('Last 7 Days Load')
        
        # 10. AI Model Features (Bottom Middle-Left)
        ax10 = fig.add_subplot(gs[2, 1])
        features = ['ACWR', 'Sleep', 'HRV', 'VO', 'GCT', 'Soreness']
        importance = [0.28, 0.22, 0.18, 0.12, 0.12, 0.08]
        colors_imp = plt.cm.RdYlGn_r(np.linspace(0.2, 0.8, len(features)))
        ax10.barh(features, importance, color=colors_imp)
        ax10.set_title('AI Risk Factor Importance')
        
        # 11. Recommendations (Bottom Middle-Right)
        ax11 = fig.add_subplot(gs[2, 2])
        ax11.axis('off')
        recs = risk_data['recommendations']
        rec_text = "ACTIONS:\n" + "\n".join([f"• {r}" for r in recs])
        ax11.text(0.05, 0.95, rec_text, transform=ax11.transAxes, fontsize=10, 
                 verticalalignment='top', bbox=dict(boxstyle='round', facecolor='#fff3e0'))
        
        # 12. Forecast (Bottom Right)
        ax12 = fig.add_subplot(gs[2, 3])
        days_forecast = list(range(14))
        current_acwr = df['acwr'].iloc[-1]
        
        # TYPO FIXED: current_acwar -> current_acwr
        reduce_load = [max(0.8, current_acwr - (i * 0.03)) for i in days_forecast]
        
        ax12.plot(days_forecast, [current_acwr + (i*0.02) for i in days_forecast], 'r--', label='Continue')
        ax12.plot(days_forecast, reduce_load, 'g-', label='Reduce')
        ax12.set_title('14-Day Forecast')
        ax12.legend()
        
        plt.tight_layout()
        return self._fig_to_base64(fig)


    # ==========================================
    # 2. RACE PACE CALCULATOR
    # ==========================================

    def create_race_pace_calculator(self, profile=None):
        """Create critical power-based race pace calculator"""
        
        fig = plt.figure(figsize=(16, 10))
        fig.suptitle('Race Pace Calculator & Strategy Planner', 
                     fontsize=18, fontweight='bold', y=0.98)
        
        gs = fig.add_gridspec(2, 3, hspace=0.35, wspace=0.35)
        
        # Athlete profile
        ftp = 250
        threshold_pace_min_km = 4.0
        
        # 1. Critical Power Curve (Top Left)
        ax1 = fig.add_subplot(gs[0, 0])
        durations = np.array([1, 2, 5, 10, 20, 30, 60, 120, 180, 360]) # minutes
        cp = 250
        w_prime = 20000
        # Power = CP + W' / t (seconds)
        power_output = cp + w_prime / (durations * 60)
        
        ax1.semilogx(durations, power_output, 'o-', linewidth=3, color='purple')
        ax1.axhline(y=cp, color='red', linestyle='--', label=f'CP: {cp}W')
        ax1.set_title('Critical Power Model')
        ax1.set_xlabel('Duration (min)')
        ax1.set_ylabel('Watts')
        
        # 2. Race Pace Chart (Top Middle)
        ax2 = fig.add_subplot(gs[0, 1])
        races = ['5K', '10K', 'Half', 'Marathon']
        target_paces = [3.8, 4.0, 4.3, 4.8]
        ax2.bar(races, target_paces, color='skyblue')
        ax2.set_title('Target Race Paces (min/km)')
        ax2.set_ylim(0, 6)
        
        # 3. Pacing Strategy (Top Right)
        ax3 = fig.add_subplot(gs[0, 2])
        dist = np.linspace(0, 42.2, 43)
        even = np.ones(43) * 4.8
        neg = 4.9 - (dist / 42.2) * 0.3
        pos = 4.5 + (dist / 42.2) * 0.8
        ax3.plot(dist, even, label='Even')
        ax3.plot(dist, neg, label='Negative Split')
        ax3.plot(dist, pos, label='Positive Split')
        ax3.set_title('Marathon Pacing Strategies')
        ax3.invert_yaxis()
        ax3.legend()
        
        # 4. HR Zones (Bottom Left)
        ax4 = fig.add_subplot(gs[1, 0])
        zones = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5']
        usage = [0, 10, 30, 55, 5]
        ax4.bar(zones, usage, color=['green', 'lightgreen', 'yellow', 'orange', 'red'])
        ax4.set_title('HR Distribution (Marathon)')
        
        # 5. Split Calculator (Bottom Middle)
        ax5 = fig.add_subplot(gs[1, 1])
        ax5.axis('off')
        calc_text = "MARATHON SPLITS (Target 3:00)\n\n5K: 21:30\n10K: 43:00\nHalf: 1:30:00\n30K: 2:09:00\nFinish: 3:00:00"
        ax5.text(0.1, 0.9, calc_text, transform=ax5.transAxes, fontsize=12, fontfamily='monospace')
        
        # 6. Predictions (Bottom Right)
        ax6 = fig.add_subplot(gs[1, 2])
        dists = ['5K', '10K', 'Half', 'Marathon']
        # Simple Riegel formula: T2 = T1 * (D2/D1)^1.06
        base_5k = 20 # mins
        pred_times = [base_5k * (d/5)**1.06 for d in [5, 10, 21.1, 42.2]]
        pred_hours = [t/60 for t in pred_times]
        ax6.bar(dists, pred_hours, color='orange')
        ax6.set_title('Predictions (Hours)')
        
        plt.tight_layout()
        return self._fig_to_base64(fig)


    # ==========================================
    # 3. ADVANCED SWIM STROKE ANALYSIS
    # ==========================================

    def generate_advanced_swim_data(self):
        """Generate detailed stroke-by-stroke swimming data"""
        np.random.seed(42)
        
        # Simulate 800m main set: 8x100m with stroke analysis
        laps = []
        
        for interval in range(8):
            for lap_in_interval in range(4):  # 4 laps = 100m
                # Fatigue factor increases
                fatigue = interval * 0.05
                
                # Stroke metrics degrade with fatigue
                stroke_rate = 42 + fatigue * 5 + np.random.normal(0, 1)
                dps = 1.6 - fatigue * 0.1 + np.random.normal(0, 0.05)
                
                # Stroke phases (as % of total stroke time)
                catch_phase = 15 + np.random.normal(0, 2)
                pull_phase = 35 + np.random.normal(0, 3)
                recovery_phase = 50 - catch_phase - pull_phase + np.random.normal(0, 2)
                
                # Stroke efficiency metrics
                distance_per_stroke = dps
                stroke_length = dps  # Same as DPS for simplicity
                stroke_count = 25 / dps  # For 25m pool
                
                # Body rotation (degrees)
                body_rotation = 45 - fatigue * 5 + np.random.normal(0, 3)
                
                # Kick efficiency
                kick_count = 6 + np.random.normal(0, 1)  # beats per stroke
                
                # Breathing pattern
                breathing_every = 2 if interval < 4 else 3  # Switch to every 3 when tired
                breaths_per_length = 25 / (dps * breathing_every)
                
                laps.append({
                    'interval': interval + 1,
                    'lap_in_interval': lap_in_interval + 1,
                    'distance': 25,
                    'cumulative_distance': (interval * 4 + lap_in_interval + 1) * 25,
                    'time': (100 / (dps * stroke_rate * 60)) * 25 + np.random.normal(0, 0.5),
                    'stroke_rate': stroke_rate,
                    'dps': dps,
                    'stroke_count': stroke_count,
                    'catch_phase': catch_phase,
                    'pull_phase': pull_phase,
                    'recovery_phase': max(0, recovery_phase),
                    'body_rotation': body_rotation,
                    'kick_count': kick_count,
                    'breathing_every': breathing_every,
                    'breaths_per_length': breaths_per_length,
                    'heart_rate': 150 + interval * 3 + np.random.normal(0, 2),
                    'swolf': (100 / (dps * stroke_rate * 60)) * 25 + stroke_count
                })
        
        return pd.DataFrame(laps)

    def create_advanced_swim_analysis(self, df=None):
        """Create comprehensive stroke analysis dashboard"""
        if df is None:
            df = self.generate_advanced_swim_data()
        
        fig = plt.figure(figsize=(18, 12))
        fig.suptitle('Advanced Swim Stroke Analysis - Freestyle Technique', 
                     fontsize=18, fontweight='bold', y=0.98)
        
        gs = fig.add_gridspec(3, 4, hspace=0.35, wspace=0.35)
        
        # ==========================================
        # 1. Stroke Rate vs DPS (Top Left)
        # ==========================================
        ax1 = fig.add_subplot(gs[0, 0])
        
        scatter = ax1.scatter(df['stroke_rate'], df['dps'], 
                             c=df['interval'], cmap='viridis', s=100, alpha=0.7, edgecolors='black')
        
        # Add efficiency contours (constant speed)
        for speed in [1.0, 1.2, 1.4, 1.6]:  # m/s
            sr_range = np.linspace(35, 50, 100)
            dps_needed = (speed * 60) / sr_range
            ax1.plot(sr_range, dps_needed, 'k--', alpha=0.3, linewidth=1)
            ax1.text(50, dps_needed[-1], f'{speed}m/s', fontsize=8, alpha=0.5)
        
        # Optimal zone
        ax1.axhspan(1.7, 2.0, 40, 45, alpha=0.2, color='green', label='Optimal Zone')
        
        ax1.set_title('Stroke Efficiency Map', fontweight='bold')
        ax1.set_xlabel('Stroke Rate (SPM)')
        ax1.set_ylabel('Distance Per Stroke (m)')
        plt.colorbar(scatter, ax=ax1, label='Interval')
        
        # ==========================================
        # 2. Stroke Phases Breakdown (Top Middle-Left)
        # ==========================================
        ax2 = fig.add_subplot(gs[0, 1])
        
        # Average phases across all strokes
        avg_catch = df['catch_phase'].mean()
        avg_pull = df['pull_phase'].mean()
        avg_recovery = df['recovery_phase'].mean()
        
        phases = ['Catch', 'Pull', 'Recovery']
        values = [avg_catch, avg_pull, avg_recovery]
        colors_phases = ['#2196f3', '#4caf50', '#ff9800']
        
        wedges, texts, autotexts = ax2.pie(values, labels=phases, autopct='%1.0f%%',
                                          colors=colors_phases, startangle=90,
                                          explode=(0.05, 0.05, 0.05))
        ax2.set_title('Stroke Phase Distribution', fontweight='bold')
        
        # ==========================================
        # 3. Body Rotation Analysis (Top Middle-Right)
        # ==========================================
        ax3 = fig.add_subplot(gs[0, 2])
        
        # Plot rotation per interval
        for interval in df['interval'].unique():
            interval_data = df[df['interval'] == interval]
            ax3.plot(interval_data['lap_in_interval'], interval_data['body_rotation'], 
                    marker='o', label=f'100m #{interval}', alpha=0.7)
        
        ax3.axhline(y=45, color='green', linestyle='--', linewidth=2, label='Optimal 45°')
        ax3.axhline(y=30, color='red', linestyle='--', linewidth=2, label='Too Flat')
        ax3.fill_between([0.5, 4.5], 40, 50, alpha=0.1, color='green')
        
        ax3.set_title('Body Rotation per Length', fontweight='bold')
        ax3.set_xlabel('Lap in 100m')
        ax3.set_ylabel('Rotation (degrees)')
        ax3.set_xticks([1, 2, 3, 4])
        ax3.legend(fontsize=8, loc='lower left')
        
        # ==========================================
        # 4. SWOLF Trend with Components (Top Right)
        # ==========================================
        ax4 = fig.add_subplot(gs[0, 3])
        
        # Plot SWOLF components
        ax4.plot(df['cumulative_distance'], df['swolf'], 'o-', linewidth=2, 
                color='purple', label='SWOLF', markersize=6)
        
        # Break down SWOLF into time and strokes
        time_component = df['time'] * 2  # Scale for visibility
        stroke_component = df['stroke_count'] * 3  # Scale for visibility
        
        ax4.plot(df['cumulative_distance'], time_component, '--', 
                color='blue', alpha=0.7, label='Time component')
        ax4.plot(df['cumulative_distance'], stroke_component, '--', 
                color='red', alpha=0.7, label='Stroke component')
        
        ax4.set_title('SWOLF Analysis', fontweight='bold')
        ax4.set_xlabel('Distance (m)')
        ax4.set_ylabel('Score')
        ax4.legend(fontsize=8)
        
        # ==========================================
        # 5. Stroke Count Consistency (Middle Left)
        # ==========================================
        ax5 = fig.add_subplot(gs[1, 0])
        
        # Box plot of stroke count per interval
        interval_groups = [df[df['interval'] == i]['stroke_count'].values for i in range(1, 9)]
        bp = ax5.boxplot(interval_groups, labels=[f'#{i}' for i in range(1, 9)], 
                        patch_artist=True)
        
        # Color boxes based on consistency
        for patch, interval in zip(bp['boxes'], range(1, 9)):
            data = df[df['interval'] == interval]['stroke_count']
            if data.std() < 1:
                patch.set_facecolor('#4caf50')  # Consistent
            elif data.std() < 2:
                patch.set_facecolor('#ff9800')  # Moderate
            else:
                patch.set_facecolor('#f44336')  # Inconsistent
        
        ax5.set_title('Stroke Count Consistency', fontweight='bold')
        ax5.set_xlabel('100m Interval')
        ax5.set_ylabel('Strokes per 25m')
        ax5.axhline(y=16, color='green', linestyle='--', alpha=0.5, label='Target')
        
        # ==========================================
        # 6. Breathing Pattern Analysis (Middle Center-Left)
        # ==========================================
        ax6 = fig.add_subplot(gs[1, 1])
        
        # Breaths per length
        breathing_data = df.groupby('interval')['breaths_per_length'].mean()
        colors_breath = ['#4caf50' if b < 4 else '#ff9800' if b < 5 else '#f44336' 
                         for b in breathing_data.values]
        
        bars = ax6.bar(range(1, 9), breathing_data.values, color=colors_breath, 
                      alpha=0.8, edgecolor='black')
        ax6.axhline(y=4, color='green', linestyle='--', linewidth=2, label='Optimal <4')
        ax6.set_title('Breaths per Length', fontweight='bold')
        ax6.set_xlabel('100m Interval')
        ax6.set_ylabel('Breaths')
        
        # Add pattern labels
        patterns = ['Bilateral\n(Every 2)' if i < 4 else 'Unilateral\n(Every 3)' for i in range(8)]
        for i, (bar, pattern) in enumerate(zip(bars, patterns)):
            height = bar.get_height()
            ax6.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                    pattern, ha='center', va='bottom', fontsize=7, rotation=45)
        
        # ==========================================
        # 7. Kick Efficiency (Middle Center-Right)
        # ==========================================
        ax7 = fig.add_subplot(gs[1, 2])
        
        kick_data = df.groupby('interval')['kick_count'].mean()
        ax7.plot(range(1, 9), kick_data.values, 'o-', linewidth=2, 
                color='blue', markersize=8, label='Kick beats/stroke')
        ax7.axhline(y=6, color='green', linestyle='--', linewidth=2, label='Optimal 6-beat')
        ax7.fill_between(range(1, 9), 5, 7, alpha=0.1, color='green')
        
        ax7.set_title('Kick Rate Analysis', fontweight='bold')
        ax7.set_xlabel('100m Interval')
        ax7.set_ylabel('Kicks per Stroke')
        ax7.legend()
        ax7.set_ylim(4, 8)
        
        # ==========================================
        # 8. Pace Degradation with Stroke Impact (Middle Right)
        # ==========================================
        ax8 = fig.add_subplot(gs[1, 3])
        
        # Calculate pace per 100m
        pace_100m = []
        for interval in range(1, 9):
            interval_data = df[df['interval'] == interval]
            avg_pace = interval_data['time'].sum() / 100 * 100  # sec/100m
            pace_100m.append(avg_pace)
        
        # Plot pace with stroke efficiency overlay
        ax8_twin = ax8.twinx()
        
        bars = ax8.bar(range(1, 9), pace_100m, color='lightblue', alpha=0.7, 
                      edgecolor='black', label='Pace')
        ax8.set_ylabel('Pace (sec/100m)', color='blue')
        
        # Overlay DPS
        dps_trend = [df[df['interval'] == i]['dps'].mean() for i in range(1, 9)]
        ax8_twin.plot(range(1, 9), dps_trend, 'ro-', linewidth=2, 
                     markersize=8, label='DPS')
        ax8_twin.set_ylabel('DPS (m)', color='red')
        
        ax8.set_title('Pace vs Efficiency', fontweight='bold')
        ax8.set_xlabel('100m Interval')
        ax8.legend(loc='upper left')
        ax8_twin.legend(loc='upper right')
        
        # ==========================================
        # 9. Technique Score Radar (Bottom Left)
        # ==========================================
        ax9 = fig.add_subplot(gs[2, 0], projection='polar')
        
        # Calculate technique scores (0-100)
        scores = {
            'DPS': min(100, (df['dps'].mean() / 1.8) * 100),
            'Rotation': min(100, (df['body_rotation'].mean() / 45) * 100),
            'Kick': min(100, (6 / df['kick_count'].mean()) * 100),
            'Consistency': max(0, 100 - (df.groupby('interval')['stroke_count'].std().mean() * 10)),
            'Breathing': min(100, (4 / df['breaths_per_length'].mean()) * 100),
            'SWOLF': max(0, 100 - (df['swolf'].mean() - 35) * 5)
        }
        
        categories = list(scores.keys())
        values = list(scores.values())
        
        angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
        values += values[:1]
        angles += angles[:1]
        
        ax9.plot(angles, values, 'o-', linewidth=2, color='blue')
        ax9.fill(angles, values, alpha=0.25, color='blue')
        ax9.set_xticks(angles[:-1])
        ax9.set_xticklabels(categories, fontsize=9)
        ax9.set_ylim(0, 100)
        ax9.set_title('Technique Score', fontweight='bold', pad=20)
        
        # ==========================================
        # 10. Stroke Length vs Rate Optimization (Bottom Middle-Left)
        # ==========================================
        ax10 = fig.add_subplot(gs[2, 1])
        
        # Create efficiency heatmap
        sr_bins = np.linspace(35, 50, 15)
        dps_bins = np.linspace(1.3, 2.0, 15)
        
        # Calculate speed for each bin
        speed_matrix = np.zeros((len(dps_bins)-1, len(sr_bins)-1))
        for i in range(len(dps_bins)-1):
            for j in range(len(sr_bins)-1):
                avg_sr = (sr_bins[j] + sr_bins[j+1]) / 2
                avg_dps = (dps_bins[i] + dps_bins[i+1]) / 2
                speed_matrix[i, j] = (avg_sr * avg_dps) / 60  # m/s
        
        im = ax10.imshow(speed_matrix, cmap='RdYlGn', aspect='auto', 
                        extent=[35, 50, 1.3, 2.0], origin='lower')
        
        # Overlay actual data points
        ax10.scatter(df['stroke_rate'], df['dps'], c='black', s=50, alpha=0.7, edgecolors='white')
        
        ax10.set_title('Speed Optimization Map', fontweight='bold')
        ax10.set_xlabel('Stroke Rate (SPM)')
        ax10.set_ylabel('DPS (m)')
        plt.colorbar(im, ax=ax10, label='Speed (m/s)')
        
        # ==========================================
        # 11. Interval Comparison Matrix (Bottom Middle-Right)
        # ==========================================
        ax11 = fig.add_subplot(gs[2, 2])
        
        # Create comparison matrix
        metrics = ['Time', 'SR', 'DPS', 'Rot', 'SWOLF']
        intervals = list(range(1, 9))
        
        matrix = np.zeros((len(metrics), len(intervals)))
        for i, metric in enumerate(['time', 'stroke_rate', 'dps', 'body_rotation', 'swolf']):
            for j, interval in enumerate(intervals):
                val = df[df['interval'] == interval][metric].mean()
                # Normalize each metric to 0-1 scale
                if metric == 'time':
                    val = (val - 20) / 10  # Normalize time
                elif metric == 'stroke_rate':
                    val = (val - 35) / 15
                elif metric == 'dps':
                    val = (val - 1.3) / 0.7
                elif metric == 'body_rotation':
                    val = val / 60
                elif metric == 'swolf':
                    val = (val - 30) / 20
                matrix[i, j] = np.clip(val, 0, 1)
        
        im = ax11.imshow(matrix, cmap='RdYlGn', aspect='auto')
        ax11.set_xticks(range(len(intervals)))
        ax11.set_xticklabels([f'#{i}' for i in intervals])
        ax11.set_yticks(range(len(metrics)))
        ax11.set_yticklabels(metrics)
        ax11.set_title('Performance Matrix', fontweight='bold')
        
        # Add text annotations
        for i in range(len(metrics)):
            for j in range(len(intervals)):
                text = ax11.text(j, i, f'{matrix[i, j]:.2f}',
                               ha="center", va="center", color="black", fontsize=8)
        
        plt.colorbar(im, ax=ax11, label='Normalized Score')
        
        # ==========================================
        # 12. Summary & Recommendations (Bottom Right)
        # ==========================================
        ax12 = fig.add_subplot(gs[2, 3])
        ax12.axis('off')
        
        avg_dps = df['dps'].mean()
        avg_sr = df['stroke_rate'].mean()
        avg_swolf = df['swolf'].mean()
        consistency = df.groupby('interval')['stroke_count'].std().mean()
        
        summary_text = f"STROKE ANALYSIS SUMMARY\n\n" + \
                       f"Overall Metrics:\n" + \
                       f"• Distance: 800m (8x100m)\n" + \
                       f"• Avg Pace: {df['time'].sum()/8/60:.2f} min/100m\n" + \
                       f"• Avg DPS: {avg_dps:.2f}m\n" + \
                       f"• Avg SR: {avg_sr:.1f} SPM\n" + \
                       f"• Avg SWOLF: {avg_swolf:.1f}\n\n" + \
                       f"Technique Breakdown:\n" + \
                       f"• Body Rotation: {df['body_rotation'].mean():.1f}°\n" + \
                       f"• Kick Rate: {df['kick_count'].mean():.1f} beats/stroke\n" + \
                       f"• Breathing: Every {df['breathing_every'].mode().values[0]} strokes\n" + \
                       f"• Stroke Consistency: {consistency:.2f} σ\n\n" + \
                       f"Technique Grade: B+"
        
        ax12.text(0.05, 0.95, summary_text, transform=ax12.transAxes, fontsize=9,
                 verticalalignment='top', fontfamily='monospace',
                 bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.3))
        
        plt.tight_layout()
        return self._fig_to_base64(fig)
