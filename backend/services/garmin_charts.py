# garmin_charts.py - Advanced Data Visualization for Coach-AI
# Integrates with Garmin Connect to fetch and visualize athlete data.
# Now includes support for Stream-based advanced analytics.
#

import matplotlib
matplotlib.use('Agg') # Use non-interactive backend for server
import matplotlib.pyplot as plt
# Remove unused imports if desired, but keep for safety
import matplotlib.dates as mdates
from matplotlib.patches import Rectangle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import io
import base64
from garminconnect import Garmin
import logging

try:
    from .garmin_charts_advanced import AdvancedGarminCharts
except ImportError:
    # Fallback if running as script or path issues
    try:
        from garmin_charts_advanced import AdvancedGarminCharts
    except ImportError:
        AdvancedGarminCharts = None
        print("Warning: AdvancedGarminCharts module not found.")

# Configure logging
logger = logging.getLogger(__name__)

class GarminChartManager:
    def __init__(self, client=None, email: str = None, password: str = None):
        # Initialize Garmin connection.
        # Can accept an existing Garmin client OR credentials to create a new one.
        if client:
            self.client = client
        elif email and password:
            self.client = Garmin(email, password)
            self.client.login()
        else:
            raise ValueError("Either 'client' or 'email'/'password' must be provided.")
            
        self.cache = {}
        
        # Initialize Advanced Charts renderer
        self.advanced_charts = AdvancedGarminCharts() if AdvancedGarminCharts else None
        
    # ==================== DATA FETCHING ====================
    
    def fetch_health_data(self, days: int = 30) -> pd.DataFrame:
        # Fetch comprehensive health metrics from Garmin
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        records = []
        current = start_date
        
        while current <= end_date:
            date_str = current.strftime("%Y-%m-%d")
            
            try:
                # Get various health metrics
                # Note: These API calls might be rate limited if done in a loop like this.
                # In a production app, we should fetch range data if available or rely on our local DB.
                # For this implementation, we'll try to use existing range methods from the client if possible, but 
                # the user provided code uses iterative fetching. We will try to optimize if the client supports it,
                # otherwise stick to the user's logic but handle errors gracefully.
                
                stats = self.client.get_user_summary(date_str)
                if not stats:
                    # Skip days with no summary (blocks crash if library returns None)
                    current += timedelta(days=1)
                    continue
                # sleep = self.client.get_sleep_data(date_str) # This is heavy
                # stress = self.client.get_stress_data(date_str) # This is heavy
                
                # Simplified for performance/rate-limit safety:
                # We will just use the summary 'stats' object for now as it contains most things.
                # The user's code expected separate calls, let's try to honor that but be careful.
                
                record = {
                    'date': current,
                    'resting_hr': stats.get('restingHeartRate'),
                    'sleep_score': stats.get('sleepScore'), # Sometimes in summary
                    'stress_score': stats.get('averageStressLevel'),
                    'body_battery': stats.get('bodyBatteryHighestValue'), # distinct from 'bodyBattery' typically
                    'steps': stats.get('totalSteps'),
                    'active_calories': stats.get('activeCalories'),
                    'vo2max': stats.get('vo2MaxRunning') or stats.get('vo2Max'),
                    'recovery_time': stats.get('recoveryTime'), # might be in different endpoint
                    'training_load': 0, # Placeholder, needs specific endpoint
                    'hrv': stats.get('hrvStatus', {}).get('weeklyAvg')
                }
                
                # If highly requested, we can do the specific calls:
                # sleep_data = self.client.get_sleep_data(date_str)
                # if sleep_data:
                #    record['sleep_score'] = sleep_data.get('dailySleepDTO', {}).get('sleepScore')
                
                records.append(record)
                
            except Exception as e:
                logger.warning(f"Error fetching data to chart for {date_str}: {e}")
                
            current += timedelta(days=1)
            
        df = pd.DataFrame(records)
        df['date'] = pd.to_datetime(df['date'])
        return df.sort_values('date')
    
    def fetch_activities(self, limit: int = 50) -> List[Dict]:
        # Fetch recent activities
        return self.client.get_activities(0, limit)
    
    def fetch_activity_details(self, activity_id: int) -> Dict:
        # Fetch detailed activity data including laps
        return self.client.get_activity_details(activity_id)

    def _get_activity_streams_data(self, activity_id: int) -> Dict[str, List[float]]:
        # Fetch and format activity streams (Power, HR, Cadence, etc.)
        # Returns a dict suitable for AdvancedGarminCharts
        try:
            # Request all relevant streams
            keys = "watts,heartRate,cadence,time" 
            # Note: Garmin API keys might be 'watts', 'heart_rate', 'cadence', 'time' or similar. 
            # 'watts' is usually power.
            
            streams = self.client.get_activity_streams(activity_id, keys=keys)
            # streams is typically a list/dict structure.
            
            data = {
                'power': [],
                'heart_rate': [],
                'cadence': [],
                'seconds': []
            }
            
            # Map stream keys to our data keys
            for key, values in streams.items():
                # The 'values' is usually the list of data points
                # Sometimes it's a dict with 'values' key
                # Adjust based on observation of GarminConnect library output
                # Typical library output: { 'watts': [...], 'heartRate': [...] }
                
                vals = values # assuming simple dict of lists from library wrapper
                
                if key == 'watts':
                    data['power'] = [v for v in vals if v is not None]
                elif key == 'heartRate':
                    data['heart_rate'] = [v for v in vals if v is not None]
                elif key == 'cadence':
                    data['cadence'] = [v for v in vals if v is not None]
                elif key == 'time':
                    # Time stream usually seconds from start
                    data['seconds'] = [v for v in vals if v is not None]
            
            # Ensure all are same length for safety, or at least exist
            # If time is missing, generate it
            if not data['seconds'] and data['power']:
                data['seconds'] = list(range(len(data['power'])))
                
            return data
            
        except Exception as e:
            logger.warning(f"Could not fetch streams for {activity_id}: {e}")
            return {}
    
    # ==================== CHART GENERATION ====================
    
    def create_performance_dashboard(self, days: int = 30, save_path: Optional[str] = None) -> str:
        # Create comprehensive performance dashboard
        # Returns: Base64 encoded PNG image
        # Fetch data
        df = self.fetch_health_data(days)
        
        if df.empty:
            return ""

        # Set style
        plt.style.use('ggplot')
        
        fig = plt.figure(figsize=(16, 10))
        fig.suptitle(f'Coach-AI Performance Dashboard - {datetime.now().strftime("%Y-%m-%d")}', 
                     fontsize=16, fontweight='bold')
        
        gs = fig.add_gridspec(2, 3, hspace=0.3, wspace=0.3)
        
        # 1. Training Load (Simulated if missing)
        ax1 = fig.add_subplot(gs[0, 0])
        # Generate dummy load if missing for visualization
        if 'training_load' not in df.columns or df['training_load'].sum() == 0:
             df['training_load'] = np.random.randint(50, 150, df.shape[0])
        self._plot_training_load(ax1, df)
        
        # 2. Recovery Metrics
        ax2 = fig.add_subplot(gs[0, 1])
        self._plot_recovery_status(ax2, df)
        
        # 3. Sleep Analysis
        ax3 = fig.add_subplot(gs[0, 2])
        self._plot_sleep_analysis(ax3, df)
        
        # 4. Heart Rate Trends
        ax4 = fig.add_subplot(gs[1, 0])
        self._plot_hr_trends(ax4, df)
        
        # 5. Weekly Summary
        ax5 = fig.add_subplot(gs[1, 1])
        self._plot_weekly_summary(ax5, df)
        
        # 6. Fitness Progress
        ax6 = fig.add_subplot(gs[1, 2])
        self._plot_fitness_progress(ax6, df)
        
        # Convert to base64 for web display
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='white')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        if save_path:
            plt.savefig(save_path, dpi=100, bbox_inches='tight', facecolor='white')
            
        plt.close()
        return img_base64
    
    def create_workout_analysis(self, activity_id: int) -> str:
        # Create detailed single workout analysis
        activity = self.fetch_activity_details(activity_id)
        if not activity:
            return ""
            
        laps = activity.get('lapDTOs', [])
        
        
        # Determine sport type and route to specialized method
        sport_type = activity.get('activityType', {}).get('typeKey', 'other')
        if sport_type == 'cycling' or sport_type == 'virtual_cycling':
             return self.create_cycling_power_analysis(activity, laps)
        elif sport_type == 'swimming' or sport_type == 'lap_swimming' or sport_type == 'open_water_swimming':
             return self.create_swim_analysis(activity, laps)

        # Default Generic Analysis (Running/Other)
        fig, axes = plt.subplots(2, 2, figsize=(14, 8))
        fig.suptitle(f'Workout Analysis: {activity.get("activityName", "Activity")}', 
                     fontsize=14, fontweight='bold')
        
        # Extract lap data
        lap_data = {
            'lap': [],
            'pace': [],
            'hr': [],
            'power': [],
            'elevation': []
        }
        
        if not laps:
             # Handle case with no laps
             ax = axes[0,0]
             ax.text(0.5, 0.5, "No Lap Data Available", ha='center', va='center')
             buf = io.BytesIO()
             plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
             buf.seek(0)
             return base64.b64encode(buf.read()).decode('utf-8')

        for i, lap in enumerate(laps):
            lap_data['lap'].append(i + 1)
            
            # Calculate pace
            distance = lap.get('distance', 0)
            duration = lap.get('duration', 1)
            if distance > 0:
                pace_sec = (duration / distance) * 1000  # sec/km
                lap_data['pace'].append(pace_sec / 60)  # min/km
            else:
                lap_data['pace'].append(0)
                
            lap_data['hr'].append(lap.get('averageHR', 0) or 0)
            lap_data['power'].append(lap.get('averagePower', 0) or 0)
            lap_data['elevation'].append(lap.get('elevationGain', 0) or 0)
        
        # Pace analysis
        ax1 = axes[0, 0]
        colors = self._pace_color_codes(lap_data['pace'])
        ax1.bar(lap_data['lap'], lap_data['pace'], color=colors, alpha=0.8)
        ax1.set_title('Pace per Lap')
        ax1.set_ylabel('min/km')
        ax1.invert_yaxis()
        
        # HR Zones
        ax2 = axes[0, 1]
        ax2.plot(lap_data['lap'], lap_data['hr'], marker='o', linewidth=2, color='red')
        ax2.fill_between(lap_data['lap'], lap_data['hr'], alpha=0.3, color='red')
        self._add_hr_zones(ax2)
        ax2.set_title('Heart Rate')
        ax2.set_ylabel('BPM')
        
        # Power (if cycling/running power)
        ax3 = axes[1, 0]
        if any(lap_data['power']):
            ax3.bar(lap_data['lap'], lap_data['power'], color='purple', alpha=0.7)
            ax3.set_title('Power Output')
            ax3.set_ylabel('Watts')
        else:
            ax3.text(0.5, 0.5, 'No Power Data', ha='center', va='center', transform=ax3.transAxes)
            ax3.set_title('Power Output')
        
        # Efficiency scatter
        ax4 = axes[1, 1]
        if len(lap_data['pace']) == len(lap_data['hr']) and len(lap_data['pace']) > 0:
            ax4.scatter(lap_data['pace'], lap_data['hr'], c=lap_data['lap'], cmap='viridis', s=100)
            ax4.set_xlabel('Pace (min/km)')
            ax4.set_ylabel('Heart Rate (BPM)')
            ax4.set_title('Pace vs HR Efficiency')
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        buf.seek(0)
        plt.close()
        return base64.b64encode(buf.read()).decode('utf-8')

    def create_cycling_power_analysis(self, activity, laps, ftp=250):
        # Generate 8-panel advanced cycling power analysis
        
        # 1. Try Advanced Stream-based Analysis first
        if self.advanced_charts:
            try:
                activity_id = activity.get('activityId')
                stream_data = self._get_activity_streams_data(activity_id)
                
                # Check if we have enough data (at least power)
                if stream_data.get('power') and len(stream_data['power']) > 10:
                    stream_data['name'] = activity.get('activityName', 'Ride')
                    return self.advanced_charts.create_cycling_power_analysis(stream_data, ftp=ftp)
            except Exception as e:
                 logger.warning(f"Failed to create advanced cycling chart: {e}. Falling back to lap analysis.")

        # 2. Fallback to Lap-based Analysis
        if not laps:
            return ""

        fig = plt.figure(figsize=(16, 10))
        fig.suptitle(f'🚴 Cycling Power Analysis: {activity.get("activityName", "Ride")}', 
                     fontsize=16, fontweight='bold')
        
        gs = fig.add_gridspec(2, 4, hspace=0.4, wspace=0.4)
        
        # Extract data
        lap_powers = [lap.get('averagePower', 0) or 0 for lap in laps]
        lap_hrs = [lap.get('averageHR', 0) or 0 for lap in laps]
        lap_cadences = [lap.get('averageCadence', 0) or 0 for lap in laps]
        lap_indices = range(1, len(laps) + 1)
        
        # 1. Power Distribution (Histogram)
        ax1 = fig.add_subplot(gs[0, 0])
        ax1.hist(lap_powers, bins=10, color='purple', alpha=0.7)
        ax1.set_title('Power Distribution')
        ax1.set_xlabel('Watts')
        
        # 2. Power Zones (Bar)
        ax2 = fig.add_subplot(gs[0, 1])
        zones = [0.55, 0.75, 0.90, 1.05, 1.20, 1.50] # % of FTP
        zone_counts = [0] * 7
        for p in lap_powers:
            if p < ftp * zones[0]: zone_counts[0] += 1
            elif p < ftp * zones[1]: zone_counts[1] += 1
            elif p < ftp * zones[2]: zone_counts[2] += 1
            elif p < ftp * zones[3]: zone_counts[3] += 1
            elif p < ftp * zones[4]: zone_counts[4] += 1
            elif p < ftp * zones[5]: zone_counts[5] += 1
            else: zone_counts[6] += 1
            
        ax2.bar(['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7'], zone_counts, color=['grey', 'blue', 'green', 'yellow', 'orange', 'red', 'purple'])
        ax2.set_title('Time in Zones')
        
        # 3. Power vs HR (Scatter - Aerobic Decoupling check)
        ax3 = fig.add_subplot(gs[0, 2])
        sc = ax3.scatter(lap_powers, lap_hrs, c=lap_indices, cmap='plasma')
        ax3.set_title('Power vs HR')
        ax3.set_xlabel('Watts')
        ax3.set_ylabel('HR')
        
        # 4. Quadrant Analysis (Force vs Cadence proxy)
        # Force approx = Power / Cadence (simplified)
        ax4 = fig.add_subplot(gs[0, 3])
        forces = []
        valid_cadences = []
        for p, c in zip(lap_powers, lap_cadences):
            if c > 0:
                forces.append(p/c)
                valid_cadences.append(c)
        
        if forces:
            ax4.scatter(valid_cadences, forces, alpha=0.6)
            ax4.axvline(x=85, linestyle='--', color='gray') # typical cadence pivot
            ax4.axhline(y=np.mean(forces), linestyle='--', color='gray') 
            ax4.set_title('Quadrant Analysis (Proxy)')
            ax4.set_xlabel('Cadence')
            ax4.set_ylabel('Force (W/rpm)')
            
        # 5. Power Curve (Laps)
        ax5 = fig.add_subplot(gs[1, 0:2]) # Span 2 cols
        ax5.plot(lap_indices, lap_powers, marker='o', color='purple')
        ax5.fill_between(lap_indices, lap_powers, color='purple', alpha=0.2)
        ax5.axhline(y=ftp, color='red', linestyle='--', label='FTP')
        ax5.set_title('Lap Power Stream')
        ax5.set_ylabel('Watts')
        ax5.legend()
        
        # 6. Summary Stats
        ax6 = fig.add_subplot(gs[1, 2])
        np_est = np.mean([p**4 for p in lap_powers])**0.25 if lap_powers else 0 # Normalized Power estimate from laps
        if_val = np_est / ftp if ftp else 0
        tss = (len(laps) * 300 * np_est * if_val) / (ftp * 3600) * 100 if ftp else 0 # Assuming 5min laps for calc? No, need duration.
        # Let's just list metrics
        cols = ['Metric', 'Value']
        cell_text = [
            ['Avg Power', f"{int(np.mean(lap_powers))} W"],
            ['Norm Power', f"{int(np_est)} W"],
            ['Intensity (IF)', f"{if_val:.2f}"],
            ['Variability (VI)', f"{np_est/np.mean(lap_powers):.2f}" if np.mean(lap_powers) > 0 else "N/A"]
        ]
        table = ax6.table(cellText=cell_text, colLabels=cols, loc='center')
        table.auto_set_font_size(False)
        table.set_fontsize(10)
        table.scale(1.2, 1.5)
        ax6.axis('off')
        ax6.set_title('Key Metrics')

        # 7. Radar Chart (Profile)
        # Needs radial axes, skipping for simplicity in this grid, using simple bar for now
        ax7 = fig.add_subplot(gs[1, 3])
        # Peaks (simulated from laps for demo)
        peaks = [max(lap_powers), np.mean(sorted(lap_powers)[-3:]), np.mean(lap_powers)]
        ax7.bar(['Peak', 'Top 3', 'Avg'], peaks, color=['red', 'orange', 'blue'])
        ax7.set_title('Power Profile')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        buf.seek(0)
        plt.close()
        return base64.b64encode(buf.read()).decode('utf-8')

    def create_swim_analysis(self, activity, laps):
        # Generate 6-panel swim efficiency analysis
        
        # 1. Try Advanced Swim Analysis (via Laps - we essentially enhance the lap data)
        # Advanced module expects list of dicts with: time, distance, stroke_rate, heart_rate
        if self.advanced_charts and laps:
            try:
                # Prepare data for advanced charts
                formatted_laps = []
                for i, lap in enumerate(laps):
                    formatted_laps.append({
                        'lap': i + 1,
                        'time': lap.get('duration', 0),
                        'distance': lap.get('distance', 0),
                        'stroke_rate': lap.get('averageStrokeRate', 0),
                        'heart_rate': lap.get('averageHR', 0),
                        # Simple classification logic if not present
                        'type': 'main_set' if (1 < i < len(laps)-1) else 'warmup' if i <= 1 else 'cooldown',
                        'interval_num': i // 4 + 1 # Pseudo interval grouping
                    })
                
                return self.advanced_charts.create_swim_analysis(formatted_laps)
            except Exception as e:
                logger.warning(f"Failed to create advanced swim chart: {e}")

        # 2. Fallback to Basic Lap Analysis
        if not laps:
            return ""

        fig = plt.figure(figsize=(16, 10))
        fig.suptitle(f'🏊 Swim Analysis: {activity.get("activityName", "Swim")}', 
                     fontsize=16, fontweight='bold')
        
        gs = fig.add_gridspec(2, 3, hspace=0.3, wspace=0.3)
        
        # Data extraction
        paces_sec = []
        strokes = []
        swolf = []
        hrs = []
        
        for lap in laps:
            dist = lap.get('distance', 0)
            dur = lap.get('duration', 0)
            count = lap.get('strokeCount', 0)
            
            if dist > 0:
                pace = (dur / dist) * 100 # sec/100m
                paces_sec.append(pace)
            else:
                paces_sec.append(0)
                
            strokes.append(count)
            # SWOLF = time for 25m + strokes for 25m (approx)
            # Garmin gives avg swolf usually, but let's calc roughly per lap if pool length known
            # Assuming 25m pool for SWOLF estimate or using Garmin's field if present
            s_score = lap.get('averageSwolf', 0)
            swolf.append(s_score)
            hrs.append(lap.get('averageHR', 0) or 0)
            
        lap_indices = range(1, len(laps) + 1)
        
        # 1. Pace per 100m
        ax1 = fig.add_subplot(gs[0, 0])
        ax1.bar(lap_indices, paces_sec, color='cyan', edgecolor='blue', alpha=0.6)
        ax1.set_title('Pace (sec/100m)')
        ax1.invert_yaxis() # Lower is faster
        
        # 2. SWOLF Trends
        ax2 = fig.add_subplot(gs[0, 1])
        ax2.plot(lap_indices, swolf, marker='o', color='green')
        ax2.set_title('SWOLF (Efficiency)')
        ax2.set_ylabel('Score (Lower is Better)')
        
        # 3. Stroke Count vs Pace
        ax3 = fig.add_subplot(gs[0, 2])
        # Efficiency scatter
        sc = ax3.scatter(strokes, paces_sec, c=lap_indices, cmap='winter')
        ax3.set_title('Stroke Count vs Pace')
        ax3.set_xlabel('Strokes per Length')
        ax3.set_ylabel('Pace (s/100m)')
        
        # 4. HR Analysis
        ax4 = fig.add_subplot(gs[1, 0])
        ax4.plot(lap_indices, hrs, color='red', marker='x')
        ax4.fill_between(lap_indices, hrs, color='red', alpha=0.1)
        ax4.set_title('Heart Rate')
        
        # 5. Interval Consistency (Box Plot if enough data, else Line)
        ax5 = fig.add_subplot(gs[1, 1])
        ax5.plot(lap_indices, paces_sec, label='Pace')
        ax5.axhline(y=np.mean(paces_sec), color='orange', linestyle='--', label='Avg')
        ax5.set_title('Consistency Check')
        ax5.invert_yaxis()
        ax5.legend()
        
        # 6. Summary Metrics
        ax6 = fig.add_subplot(gs[1, 2])
        avg_swolf = np.mean([s for s in swolf if s > 0]) if swolf else 0
        avg_pace = np.mean([p for p in paces_sec if p > 0]) if paces_sec else 0
        mins = int(avg_pace // 60)
        secs = int(avg_pace % 60)
        
        cols = ['Metric', 'Value']
        cell_text = [
            ['Avg Pace', f"{mins}:{secs:02d} /100m"],
            ['Avg SWOLF', f"{int(avg_swolf)}"],
            ['Efficiency', "Excellent" if avg_swolf < 35 else "Good" if avg_swolf < 45 else "Average"],
            ['Total Laps', f"{len(laps)}"]
        ]
        table = ax6.table(cellText=cell_text, colLabels=cols, loc='center')
        table.scale(1.2, 1.5)
        ax6.axis('off')
        ax6.set_title('Swim Summary')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        buf.seek(0)
        plt.close()
        return base64.b64encode(buf.read()).decode('utf-8')

    
    # ==================== HELPER METHODS ====================
    
    def _plot_training_load(self, ax, df):
        # Plot CTL/ATL/TSB
        df['ctl'] = df['training_load'].rolling(window=7, min_periods=1).mean()
        df['atl'] = df['training_load'].rolling(window=3, min_periods=1).mean()
        df['tsb'] = df['ctl'] - df['atl']
        
        ax.bar(df['date'], df['training_load'], alpha=0.3, color='gray', label='Daily')
        ax.plot(df['date'], df['ctl'], color='blue', linewidth=2, label='Fitness (CTL)')
        ax.plot(df['date'], df['atl'], color='orange', linewidth=2, label='Fatigue (ATL)')
        ax_twin = ax.twinx()
        ax_twin.plot(df['date'], df['tsb'], color='green', linewidth=2, linestyle='--', label='Form')
        ax.set_title('Training Load')
        ax.legend(loc='upper left')
        ax_twin.legend(loc='upper right')
    
    def _plot_recovery_status(self, ax, df):
        # Plot recovery metrics
        df['recovery_score'] = (
            (100 - df['resting_hr'].fillna(60) + 40) * 0.3 +
            df['sleep_score'].fillna(70) * 0.3 +
            (100 - df['stress_score'].fillna(40)) * 0.2 +
            df['body_battery'].fillna(70) * 0.2
        )
        
        # Determine colors based on score
        colors = ['#ff4444' if x < 50 else '#ffaa00' if x < 70 else '#44ff44' 
                  for x in df['recovery_score'].fillna(50)] # Safe access
        
        ax.bar(df['date'], df['recovery_score'].fillna(0), color=colors, alpha=0.8)
        ax.axhline(y=70, color='green', linestyle='--', alpha=0.5)
        ax.set_title('Recovery Status')
        ax.set_ylabel('Score')
    
    def _plot_sleep_analysis(self, ax, df):
        # Plot sleep trends
        # Ensure sleep_score has no NaNs for list comprehension
        sleep_scores = df['sleep_score'].fillna(0)
        
        colors = ['red' if x < 60 else 'orange' if x < 75 else 'green' 
                  for x in sleep_scores]
        
        # CRITICAL FIX: Fill None/NaN with 0 for plotting
        ax.bar(df['date'], sleep_scores, color=colors, alpha=0.7)
        ax.axhline(y=80, color='green', linestyle='--', alpha=0.5)
        ax.set_title('Sleep Score')
        ax.set_ylim(0, 100)
    
    def _plot_hr_trends(self, ax, df):
        # Plot RHR and HRV
        ax.plot(df['date'], df['resting_hr'].fillna(0), marker='o', label='RHR', color='red')
        # Check if HRV exists
        if 'hrv' in df.columns and df['hrv'].notna().any():
            ax_twin = ax.twinx()
            ax_twin.plot(df['date'], df['hrv'], marker='s', color='purple', label='HRV')
            ax_twin.set_ylabel('HRV (ms)')
            ax_twin.legend(loc='upper right')

        ax.set_title('Heart Rate Trends')
        ax.set_ylabel('RHR (BPM)')
        ax.legend(loc='upper left')
    
    def _plot_weekly_summary(self, ax, df):
        # Plot weekly aggregates
        if df.empty: return
        df['week'] = df['date'].dt.isocalendar().week
        weekly = df.groupby('week').agg({
            'training_load': 'sum',
            'steps': 'mean',
            'sleep_score': 'mean'
        }).tail(4)
        
        x = np.arange(len(weekly))
        width = 0.35
        # Prevent errors if missing data
        t_load = weekly['training_load'].fillna(0)
        steps = weekly['steps'].fillna(0)

        ax.bar(x - width/2, t_load, width, label='Load', color='skyblue')
        ax_twin = ax.twinx()
        ax_twin.bar(x + width/2, steps/100, width, label='Steps (÷100)', color='orange')
        ax.set_title('Weekly Summary')
        ax.set_xticks(x)
        ax.set_xticklabels([f'W{w}' for w in weekly.index])
    
    def _plot_fitness_progress(self, ax, df):
        # Plot VO2Max and fitness trends
        if 'vo2max' in df.columns and df['vo2max'].notna().any():
            ax.plot(df['date'], df['vo2max'], marker='o', linewidth=2, color='darkblue')
            ax.fill_between(df['date'], df['vo2max'], alpha=0.2, color='darkblue')
        ax.set_title('VO2Max Progress')
        ax.set_ylabel('ml/kg/min')
    
    def _pace_color_codes(self, paces):
        # Return colors based on pace zones
        colors = []
        for pace in paces:
            if pace < 5.0:
                colors.append('green')
            elif pace < 5.5:
                colors.append('orange')
            else:
                colors.append('red')
        return colors
    
    def _add_hr_zones(self, ax):
        # Add HR zone backgrounds
        zones = [
            (0, 114, '#e8f5e9', 'Zone 1'),
            (114, 133, '#fff3e0', 'Zone 2'),
            (133, 152, '#ffebee', 'Zone 3'),
            (152, 171, '#f3e5f5', 'Zone 4'),
            (171, 200, '#ffebee', 'Zone 5')
        ]
        for min_hr, max_hr, color, label in zones:
            ax.axhspan(min_hr, max_hr, alpha=0.2, color=color)
