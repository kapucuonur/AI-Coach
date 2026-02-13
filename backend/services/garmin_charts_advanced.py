"""
garmin_charts_advanced.py - Professional Training Analytics for Coach-AI
Includes: Cycling Power Analysis, Swimming Metrics, Running Dynamics
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Circle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union
import io
import base64
from dataclasses import dataclass

# Optional imports - handle gracefully if not available
try:
    from garminconnect import Garmin
    GARMIN_AVAILABLE = True
except ImportError:
    GARMIN_AVAILABLE = False
    print("Warning: garminconnect not installed. Using mock data.")

@dataclass
class PowerZones:
    """Cycling power zones based on FTP"""
    ftp: float
    
    def get_zones(self) -> Dict[str, Tuple[float, float]]:
        return {
            'Z1 Recovery': (0, 0.55 * self.ftp),
            'Z2 Endurance': (0.55 * self.ftp, 0.75 * self.ftp),
            'Z3 Tempo': (0.75 * self.ftp, 0.90 * self.ftp),
            'Z4 Threshold': (0.90 * self.ftp, 1.05 * self.ftp),
            'Z5 VO2Max': (1.05 * self.ftp, 1.20 * self.ftp),
            'Z6 Anaerobic': (1.20 * self.ftp, 1.50 * self.ftp),
            'Z7 Neuromuscular': (1.50 * self.ftp, 2.00 * self.ftp)
        }

@dataclass
class SwimMetrics:
    """Swimming performance metrics"""
    pool_length: float = 25.0  # meters
    total_distance: float = 0
    total_time: float = 0
    avg_pace_100m: float = 0
    avg_stroke_rate: float = 0
    avg_dps: float = 0  # Distance per stroke
    swolf_score: float = 0

class AdvancedGarminCharts:
    """Advanced charting system for multi-sport analysis"""
    
    def __init__(self, email: Optional[str] = None, password: Optional[str] = None):
        """Initialize with optional Garmin credentials"""
        self.client = None
        if email and password and GARMIN_AVAILABLE:
            try:
                self.client = Garmin(email, password)
                self.client.login()
                print("✅ Connected to Garmin Connect")
            except Exception as e:
                print(f"⚠️  Could not connect to Garmin: {e}")
        
        # Setup plotting style
        plt.style.use('ggplot') # seaborn-v0_8-whitegrid might not be available in all envs, safe fallback or use it if sure
        try:
             plt.style.use('seaborn-v0_8-whitegrid')
        except:
             pass

        self.colors = {
            'power_zones': {
                'Z1 Recovery': '#4caf50',
                'Z2 Endurance': '#8bc34a',
                'Z3 Tempo': '#ffeb3b',
                'Z4 Threshold': '#ff9800',
                'Z5 VO2Max': '#f44336',
                'Z6 Anaerobic': '#9c27b0',
                'Z7 Neuromuscular': '#673ab7'
            },
            'swim_sections': {
                'warmup': '#4caf50',
                'main_set': '#ff9800',
                'cooldown': '#2196f3'
            },
            'hr_zones': {
                'Z1': '#4caf50',
                'Z2': '#8bc34a',
                'Z3': '#ffeb3b',
                'Z4': '#ff9800',
                'Z5': '#f44336'
            }
        }
    
    # ==================== CYCLING POWER ANALYSIS ====================
    
    def create_cycling_power_analysis(self, activity_data: Dict, 
                                     ftp: Optional[float] = None) -> str:
        """
        Create comprehensive cycling power analysis
        
        Args:
            activity_data: Dict with 'power', 'heart_rate', 'cadence', 'seconds' arrays
            ftp: Functional Threshold Power (auto-estimated if None)
        
        Returns:
            Base64 encoded PNG image
        """
        # Extract data
        power = np.array(activity_data.get('power', []))
        hr = np.array(activity_data.get('heart_rate', []))
        cadence = np.array(activity_data.get('cadence', []))
        seconds = np.array(activity_data.get('seconds', []))
        
        if len(power) == 0:
            return self._error_chart("No power data available")
        
        # Auto-estimate FTP if not provided (simplified method)
        if ftp is None:
            if len(power) > 0:
                ftp = np.percentile(power, 95)  # Rough estimate from 95th percentile
            else:
                ftp = 200
        
        zones = PowerZones(ftp).get_zones()
        
        # Calculate metrics
        if len(power) > 0:
            np_value = np.mean(power**4)**0.25  # Normalized power
            avg_power = np.mean(power)
            max_power = np.max(power)
            tss = (len(seconds) * np_value * (np_value/ftp)) / (ftp * 3600) * 100
            vi = np_value / avg_power if avg_power > 0 else 1.0
        else:
            np_value, avg_power, max_power, tss, vi = 0, 0, 0, 0, 0
        
        # Create figure
        fig = plt.figure(figsize=(16, 10))
        fig.suptitle(f'Cycling Power Analysis - {activity_data.get("name", "Workout")}', 
                    fontsize=16, fontweight='bold')
        
        gs = fig.add_gridspec(3, 3, hspace=0.35, wspace=0.3)
        
        # 1. Power curve with zones
        ax1 = fig.add_subplot(gs[0, :2])
        self._plot_power_curve(ax1, seconds, power, zones, ftp, np_value)
        
        # 2. Time in zones
        ax2 = fig.add_subplot(gs[0, 2])
        self._plot_power_distribution(ax2, power, zones)
        
        # 3. Power vs HR
        ax3 = fig.add_subplot(gs[1, 0])
        self._plot_power_hr_correlation(ax3, power, hr, seconds)
        
        # 4. Quadrant analysis
        ax4 = fig.add_subplot(gs[1, 1])
        self._plot_quadrant_analysis(ax4, power, cadence, ftp)
        
        # 5. Mean Maximal Power curve
        ax5 = fig.add_subplot(gs[1, 2])
        self._plot_mmp_curve(ax5, power, ftp)
        
        # 6. Power profile radar
        ax6 = fig.add_subplot(gs[2, 0], projection='polar')
        self._plot_power_profile_radar(ax6, power)
        
        # 7. Variability Index
        ax7 = fig.add_subplot(gs[2, 1])
        self._plot_variability_index(ax7, power, seconds)
        
        # 8. Summary stats
        ax8 = fig.add_subplot(gs[2, 2])
        self._plot_cycling_summary(ax8, {
            'duration': len(seconds),
            'avg_power': avg_power,
            'np': np_value,
            'max_power': max_power,
            'vi': vi,
            'tss': tss,
            'ftp': ftp,
            'avg_hr': np.mean(hr) if len(hr) > 0 else 0,
            'max_hr': np.max(hr) if len(hr) > 0 else 0,
            'avg_cadence': np.mean(cadence) if len(cadence) > 0 else 0
        })
        
        return self._fig_to_base64(fig)
    
    def _plot_power_curve(self, ax, seconds, power, zones, ftp, np_value):
        """Plot power over time with zone colors"""
        if len(seconds) == 0: return

        # Downsample for performance if needed
        if len(seconds) > 5000:
            step = len(seconds) // 2000
            seconds = seconds[::step]
            power = power[::step]
        
        # Plot with zone colors
        # For simplicity in this implementation, we plot one line and color segments or just plot main line
        # Plotting segments individually is slow in matplotlib for thousands of points
        # Optimization: Plot the line in grey and add colored spans or just plot colored line
        
        # Simple fast plotting for now:
        ax.plot(seconds/60, power, color='gray', linewidth=0.5, alpha=0.5)
        
        # Overlay moving average
        power_series = pd.Series(power)
        rolling = power_series.rolling(window=max(5, int(len(power)/100))).mean()
        ax.plot(seconds/60, rolling, color='black', linewidth=1.5)
        
        ax.axhline(y=ftp, color='red', linestyle='--', linewidth=2, label=f'FTP: {ftp:.0f}W')
        ax.axhline(y=np_value, color='blue', linestyle=':', linewidth=2, label=f'NP: {np_value:.0f}W')
        ax.set_title('Power Output Over Time')
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Power (Watts)')
        ax.legend()
    
    def _plot_power_distribution(self, ax, power, zones):
        """Plot time spent in each power zone"""
        if len(power) == 0: return
        zone_times = {}
        for zone_name, (low, high) in zones.items():
            mask = (power >= low) & (power < high)
            zone_times[zone_name] = np.sum(mask) / 60  # minutes
        
        colors = [self.colors['power_zones'][z] for z in zone_times.keys()]
        bars = ax.barh(list(zone_times.keys()), list(zone_times.values()), color=colors, alpha=0.8)
        ax.set_title('Time in Power Zones')
        ax.set_xlabel('Minutes')
        
        # Add percentage labels
        total = sum(zone_times.values())
        if total > 0:
            for bar in bars:
                width = bar.get_width()
                if width > 0:
                    pct = (width / total) * 100
                    ax.text(width + 0.5, bar.get_y() + bar.get_height()/2, 
                        f'{pct:.1f}%', va='center', fontsize=8)
    
    def _plot_power_hr_correlation(self, ax, power, hr, seconds):
        """Plot power vs heart rate scatter"""
        if len(hr) != len(power) or len(hr) == 0:
            ax.text(0.5, 0.5, 'No HR Data', ha='center', va='center', transform=ax.transAxes)
            return
        
        # Use simple scatter with subsets if too large
        step = 1
        if len(power) > 2000: step = 5
        
        scatter = ax.scatter(power[::step], hr[::step], c=seconds[::step]/60, cmap='viridis', alpha=0.5, s=5)
        
        # Trend line
        try:
            z = np.polyfit(power, hr, 1)
            p = np.poly1d(z)
            sorted_idx = np.argsort(power)
            ax.plot(power[sorted_idx], p(power[sorted_idx]), "r--", alpha=0.8, linewidth=2)
        except:
            pass
            
        ax.set_title('Power vs Heart Rate')
        ax.set_xlabel('Power (W)')
        ax.set_ylabel('Heart Rate (BPM)')
        # plt.colorbar(scatter, ax=ax, label='Time (min)') # Can cause layout issues in subplots sometimes
    
    def _plot_quadrant_analysis(self, ax, power, cadence, ftp):
        """Plot force vs cadence quadrant analysis"""
        if len(cadence) != len(power) or len(cadence) == 0:
            ax.text(0.5, 0.5, 'No Cadence Data', ha='center', va='center', transform=ax.transAxes)
            return
        
        # Smooth data
        power_smooth = pd.Series(power).rolling(window=10, center=True).mean()
        cadence_smooth = pd.Series(cadence).rolling(window=10, center=True).mean()
        
        # Calculate approximate effective pedal force (Newtons not exactly but proportional)
        # Force ~ Power / Cadence
        # Filter 0 cadence
        mask = (cadence_smooth > 20) & (power_smooth > 20)
        p = power_smooth[mask]
        c = cadence_smooth[mask]
        
        if len(c) == 0:
             ax.text(0.5, 0.5, 'Insufficient Data', ha='center', transform=ax.transAxes)
             return

        # Simple plot: Power vs Cadence (Standard QA uses AEPF vs CPV, but P vs C is common proxy)
        # Actually Quadrant Analysis is AEPF (Average Effective Pedal Force) vs CPV (Circumferential Pedal Velocity).
        # AEPF (N) = (Power (W) * 60) / (2 * PI * Cadence * CrankLength)
        # We don't have crank length, assuming 172.5mm is standard.
        # CPV (m/s) = Cadence * 2 * PI * CrankLength / 60
        
        crank_length = 0.1725
        cpv = c * 2 * np.pi * crank_length / 60
        aepf = (p * 60) / (2 * np.pi * c * crank_length)
        
        step = 1
        if len(aepf) > 2000: step = 5
        
        ax.scatter(cpv[::step], aepf[::step], alpha=0.3, s=5, color='purple')
        
        # Thresholds (Example)
        ax.set_title('Quadrant Analysis (AEPF vs CPV)')
        ax.set_xlabel('Pedal Velocity (m/s)')
        ax.set_ylabel('Pedal Force (N)')
    
    def _plot_mmp_curve(self, ax, power, ftp):
        """Plot Mean Maximal Power curve"""
        if len(power) == 0: return
        
        durations = [1, 5, 10, 30, 60, 300, 600, 1200, 3600]
        mmp = []
        
        power_s = pd.Series(power)
        
        for dur in durations:
            if dur <= len(power):
                rolling = power_s.rolling(window=dur).mean()
                mmp.append(rolling.max())
            else:
                mmp.append(np.nan)
        
        # Filter nans
        valid_durs = [d for d, m in zip(durations, mmp) if not np.isnan(m)]
        valid_mmp = [m for m in mmp if not np.isnan(m)]

        if valid_durs:
            ax.semilogx(valid_durs, valid_mmp, 'o-', linewidth=2, markersize=6, color='purple')
            ax.axhline(y=ftp, color='red', linestyle='--', alpha=0.7, label='FTP')
            ax.set_title('Mean Maximal Power')
            ax.set_xlabel('Duration (seconds)')
            ax.set_ylabel('Power (W)')
            ax.legend()
            ax.grid(True, alpha=0.3)
    
    def _plot_power_profile_radar(self, ax, power):
        """Plot power profile radar chart"""
        if len(power) == 0: return

        categories = ['5s Peak', '1min', '5min', '20min', '60min']
        power_s = pd.Series(power)
        
        # Calculate max power for each duration
        values = [
            np.max(power),
            power_s.rolling(60).mean().max() if len(power) >= 60 else 0,
            power_s.rolling(300).mean().max() if len(power) >= 300 else 0,
            power_s.rolling(1200).mean().max() if len(power) >= 1200 else 0,
            power_s.rolling(3600).mean().max() if len(power) >= 3600 else 0
        ]
        
        # Replace nans
        values = [v if not pd.isna(v) else 0 for v in values]
        max_val = max(values) if max(values) > 0 else 1
        # Normalize roughly for visualization? 
        # Or better: Normalize against World Class/Cat 1/etc if we had the table.
        # Here just normalize to max_val to show shape relative to peak
        values_norm = [v/max_val * 100 for v in values]
        
        angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
        values_norm += values_norm[:1]
        angles += angles[:1]
        
        ax.plot(angles, values_norm, 'o-', linewidth=2, color='blue')
        ax.fill(angles, values_norm, alpha=0.25, color='blue')
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(categories, fontsize=8)
        ax.set_ylim(0, 100)
        ax.set_title('Power Profile (Shape)', pad=20)
    
    def _plot_variability_index(self, ax, power, seconds):
        """Plot Variability Index over time"""
        window = 300  # 5 minutes
        if len(power) < window: return
        
        vi_values = []
        times = []
        
        power_s = pd.Series(power)
        # Calculate Rolling NP and Avg Power
        # This is expensive to do exactly for every second. Do strides.
        stride = 60
        for i in range(window, len(power), stride):
            segment = power[i-window:i]
            avg_p = np.mean(segment)
            np_p = np.mean(segment**4)**0.25
            vi = np_p / avg_p if avg_p > 0 else 1
            vi_values.append(vi)
            times.append(i/60)
        
        ax.plot(times, vi_values, marker='o', linewidth=2, color='green')
        ax.axhline(y=1.05, color='orange', linestyle='--', alpha=0.7)
        ax.axhline(y=1.15, color='red', linestyle='--', alpha=0.7)
        ax.set_title('Variability Index (5min rolling)')
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('VI (NP/AVG)')
    
    def _plot_cycling_summary(self, ax, metrics):
        """Plot summary statistics"""
        ax.axis('off')
        text = f"""
        WORKOUT SUMMARY
        
        Duration: {metrics['duration']/60:.0f} min
        
        Power:
        • Avg: {metrics['avg_power']:.0f}W
        • NP: {metrics['np']:.0f}W
        • Max: {metrics['max_power']:.0f}W
        • VI: {metrics['vi']:.3f}
        
        Load:
        • TSS: {metrics['tss']:.1f}
        • FTP: {metrics['ftp']:.0f}W
        
        Heart Rate:
        • Avg: {metrics['avg_hr']:.0f} BPM
        • Max: {metrics['max_hr']:.0f} BPM
        
        Cadence:
        • Avg: {metrics['avg_cadence']:.0f} RPM
        """
        ax.text(0.1, 0.9, text, transform=ax.transAxes, fontsize=9,
               verticalalignment='top', fontfamily='monospace',
               bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.3))
    
    # ==================== SWIMMING ANALYSIS ====================
    
    def create_swim_analysis(self, lap_data: List[Dict]) -> str:
        """
        Create swimming performance analysis
        
        Args:
            lap_data: List of dicts with 'time', 'distance', 'stroke_rate', 'heart_rate', etc.
        
        Returns:
            Base64 encoded PNG image
        """
        df = pd.DataFrame(lap_data)
        if len(df) == 0:
            return self._error_chart("No swim data available")
        
        # Calculate metrics
        # Ensure columns exist
        if 'time' not in df.columns: df['time'] = df.get('duration', 0)
        
        df['pace_100m'] = (df['time'] / df['distance']) * 100
        df['pace_100m'] = df['pace_100m'].fillna(0)
        
        # Estimate DPS if not present
        if 'dps' not in df.columns:
            # DPS = Distance / Strokes
            # Stroke Rate is SPM. Strokes = (SR/60) * Time
            if 'stroke_rate' in df.columns:
                 strokes = (df['stroke_rate'] / 60) * df['time']
                 df['dps'] = df['distance'] / strokes
                 df['dps'] = df['dps'].replace([np.inf, -np.inf], 0).fillna(0)
            else:
                 df['dps'] = 0

        # SWOLF
        if 'swolf' not in df.columns:
             # SWOLF = Time + Strokes
             if 'stroke_rate' in df.columns:
                  strokes = (df['stroke_rate'] / 60) * df['time']
                  df['swolf'] = df['time'] + strokes
             else:
                  df['swolf'] = 0

        
        fig = plt.figure(figsize=(16, 10))
        fig.suptitle('Swimming Performance Analysis', fontsize=16, fontweight='bold')
        
        gs = fig.add_gridspec(2, 3, hspace=0.35, wspace=0.3)
        
        # 1. Pace per lap
        ax1 = fig.add_subplot(gs[0, 0])
        self._plot_swim_pace(ax1, df)
        
        # 2. Interval consistency
        ax2 = fig.add_subplot(gs[0, 1])
        self._plot_swim_intervals(ax2, df)
        
        # 3. Stroke efficiency
        ax3 = fig.add_subplot(gs[0, 2])
        self._plot_stroke_efficiency(ax3, df)
        
        # 4. SWOLF analysis
        ax4 = fig.add_subplot(gs[1, 0])
        self._plot_swolf(ax4, df)
        
        # 5. Heart rate
        ax5 = fig.add_subplot(gs[1, 1])
        self._plot_swim_hr(ax5, df)
        
        # 6. Summary
        ax6 = fig.add_subplot(gs[1, 2])
        self._plot_swim_summary(ax6, df)
        
        return self._fig_to_base64(fig)
    
    def _plot_swim_pace(self, ax, df):
        """Plot pace per lap"""
        if 'type' in df.columns:
            for lap_type in df['type'].unique():
                mask = df['type'] == lap_type
                color = self.colors['swim_sections'].get(lap_type, 'gray')
                ax.scatter(df[mask].index + 1, df[mask]['pace_100m'], c=color, label=lap_type, alpha=0.7)
        else:
            ax.plot(df.index + 1, df['pace_100m'], marker='o', alpha=0.7, color='blue')
        
        ax.set_title('Pace per Lap')
        ax.set_xlabel('Lap Number')
        ax.set_ylabel('Pace (sec/100m)')
        ax.legend()
        ax.invert_yaxis()
    
    def _plot_swim_intervals(self, ax, df):
        """Plot interval consistency"""
        if 'interval_num' not in df.columns:
            # Fallback to just plot pace
            ax.plot(df.index + 1, df['pace_100m'], color='orange')
            ax.set_title('Pace Consistency')
            ax.invert_yaxis()
            return
        
        intervals = df.groupby('interval_num')['pace_100m'].mean()
        # Color mapping requires normalization
        if len(intervals) > 0:
            norm = plt.Normalize(intervals.min(), intervals.max())
            colors = plt.cm.RdYlGn_r(norm(intervals.values))
            bars = ax.bar(intervals.index, intervals.values, color=colors, alpha=0.8)
        
        ax.set_title('Interval Pace Consistency')
        ax.set_xlabel('Interval')
        ax.set_ylabel('Avg Pace (sec/100m)')
        ax.invert_yaxis()
    
    def _plot_stroke_efficiency(self, ax, df):
        """Plot stroke rate vs distance per stroke"""
        if 'stroke_rate' not in df.columns or 'dps' not in df.columns: return

        scatter = ax.scatter(df['stroke_rate'], df['dps'], c=df.index, cmap='viridis', alpha=0.6)
        ax.set_title('Stroke Efficiency (SR vs DPS)')
        ax.set_xlabel('Stroke Rate (spm)')
        ax.set_ylabel('Distance Per Stroke (m)')
        
        # Add speed contours
        # Speed (m/s) = DPS * (SR/60) => DPS = Speed / (SR/60) = 60*Speed / SR
        sr_range = np.linspace(df['stroke_rate'].min(), df['stroke_rate'].max(), 50)
        if len(sr_range) > 0:
            for speed in [1.0, 1.2, 1.4, 1.6]:
                 dps = (speed * 60) / sr_range
                 ax.plot(sr_range, dps, 'k--', alpha=0.3, linewidth=1)
    
    def _plot_swolf(self, ax, df):
        """Plot SWOLF score"""
        if 'swolf' not in df.columns: return

        if 'type' in df.columns:
            for lap_type in df['type'].unique():
                mask = df['type'] == lap_type
                color = self.colors['swim_sections'].get(lap_type, 'gray')
                ax.plot(df[mask].index + 1, df[mask]['swolf'], marker='o', color=color, label=lap_type)
        else:
            ax.plot(df.index + 1, df['swolf'], marker='o', color='green')
        
        ax.set_title('SWOLF Score (Lower = Better)')
        ax.set_xlabel('Lap')
        ax.set_ylabel('SWOLF')
    
    def _plot_swim_hr(self, ax, df):
        """Plot heart rate during swim"""
        if 'heart_rate' not in df.columns or df['heart_rate'].isna().all():
            ax.text(0.5, 0.5, 'No HR data', ha='center', transform=ax.transAxes)
            return
        
        ax.plot(df.index + 1, df['heart_rate'], marker='o', linewidth=2, color='red')
        ax.set_title('Heart Rate')
        ax.set_xlabel('Lap')
        ax.set_ylabel('BPM')
    
    def _plot_swim_summary(self, ax, df):
        """Plot swim summary"""
        ax.axis('off')
        
        # Calculate summaries
        total_dist = df['distance'].sum() if 'distance' in df.columns else 0
        total_time = df['time'].sum() if 'time' in df.columns else 0
        avg_pace = df['pace_100m'].mean() if 'pace_100m' in df.columns else 0
        avg_sr = df['stroke_rate'].mean() if 'stroke_rate' in df.columns else 0
        avg_dps = df['dps'].mean() if 'dps' in df.columns else 0
        avg_swolf = df['swolf'].mean() if 'swolf' in df.columns else 0
        
        text = f"""
        SWIM SUMMARY
        
        Distance: {total_dist:.0f}m
        Time: {total_time/60:.1f} min
        
        Performance:
        • Avg Pace: {avg_pace:.1f}s/100m
        • Best Pace: {df['pace_100m'].min() if 'pace_100m' in df.columns else 0:.1f}s/100m
        
        Stroke:
        • Avg SR: {avg_sr:.1f} spm
        • Avg DPS: {avg_dps:.2f}m
        • SWOLF: {avg_swolf:.1f}
        """
        ax.text(0.1, 0.9, text, transform=ax.transAxes, fontsize=9,
               verticalalignment='top', fontfamily='monospace',
               bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.3))
    
    # ==================== UTILITY METHODS ====================
    
    def _fig_to_base64(self, fig) -> str:
        """Convert figure to base64 string"""
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        return img_base64
    
    def _error_chart(self, message: str) -> str:
        """Create error message chart"""
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.text(0.5, 0.5, message, ha='center', va='center', 
               transform=ax.transAxes, fontsize=14, color='red')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        return self._fig_to_base64(fig)
