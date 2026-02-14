"""
garmin_charts_running_triathlon.py - Complete Running Dynamics & Triathlon Analysis
For Coach-AI Pro - Professional-grade multi-sport analytics
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Circle, Wedge
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import io
import base64

plt.style.use('seaborn-v0_8-whitegrid')

class RunningTriathlonAnalytics:
    """
    Professional running dynamics and triathlon analysis for Coach-AI
    """
    
    def __init__(self):
        self.colors = {
            'swim': '#1e88e5', 'bike': '#43a047', 'run': '#e53935',
            't1': '#fdd835', 't2': '#fdd835',
            'good': '#4caf50', 'average': '#ff9800', 'poor': '#f44336'
        }
    
    # ==================== RUNNING DYNAMICS ====================
    
    def create_running_dynamics_analysis(self, activity_data: Dict) -> Dict:
        """
        Create comprehensive running dynamics analysis
        
        Required fields in activity_data:
        - distance: list of distances (m)
        - time: list of timestamps (sec)
        - pace: list of paces (sec/km)
        - cadence: list of cadence values (spm)
        - stride_length: list of stride lengths (m)
        - vertical_oscillation: list of VO (cm)
        - ground_contact_time: list of GCT (ms)
        - ground_contact_balance: list of balance (%)
        - heart_rate: list of HR (bpm)
        - elevation: list of elevation (m) [optional]
        
        Returns:
            Dict with 'chart' (base64), 'efficiency_score', 'grade', 'form_analysis'
        """
        
        df = pd.DataFrame(activity_data)
        
        # Calculate efficiency score (0-100)
        df['efficiency_score'] = (
            np.clip((10 - df['vertical_oscillation']) * 10, 0, 30) +
            np.clip((280 - df['ground_contact_time']) / 2, 0, 30) +
            np.clip((10 - abs(df['ground_contact_balance'])) * 2, 0, 20) +
            np.clip((df['cadence'] - 165) / 30 * 20, 0, 20)
        )
        
        avg_efficiency = df['efficiency_score'].mean()
        
        # Determine grade
        if avg_efficiency >= 85:
            grade = 'A+'
        elif avg_efficiency >= 80:
            grade = 'A'
        elif avg_efficiency >= 70:
            grade = 'B'
        elif avg_efficiency >= 60:
            grade = 'C'
        else:
            grade = 'D'
        
        # Form factor analysis
        form_analysis = {
            'efficient': int(((df['efficiency_score'] > 80) & 
                            (df['vertical_oscillation'] < 8.5) & 
                            (df['ground_contact_time'] < 230)).sum()),
            'overstrider': int(((df['stride_length'] > 2.0) & (df['cadence'] < 172)).sum()),
            'shuffler': int(((df['stride_length'] < 1.7) & (df['cadence'] > 185)).sum()),
            'bouncer': int((df['vertical_oscillation'] > 10).sum()),
            'heavy_landing': int((df['ground_contact_time'] > 250).sum())
        }
        
        # Create 12-panel dashboard
        fig = plt.figure(figsize=(20, 14))
        fig.suptitle(f'Running Dynamics Analysis - {df["distance"].max()/1000:.1f}K Run', 
                    fontsize=18, fontweight='bold')
        gs = fig.add_gridspec(3, 4, hspace=0.4, wspace=0.35)
        
        colors = self.colors
        
        # 1. Pace & Elevation
        ax1 = fig.add_subplot(gs[0, 0])
        ax1.plot(df['distance']/1000, df['pace']/60, 'b-', linewidth=2)
        ax1.fill_between(df['distance']/1000, df['pace']/60, alpha=0.3, color='blue')
        ax1.set_ylabel('Pace (min/km)', color='blue')
        ax1.tick_params(axis='y', labelcolor='blue')
        ax1.invert_yaxis()
        if 'elevation' in df.columns:
            ax1_twin = ax1.twinx()
            ax1_twin.fill_between(df['distance']/1000, df['elevation'], alpha=0.3, color='brown')
            ax1_twin.set_ylabel('Elevation (m)', color='brown')
        ax1.set_title('Pace Profile')
        
        # 2. Cadence
        ax2 = fig.add_subplot(gs[0, 1])
        cad_colors = [colors['good'] if 175 <= c <= 185 else colors['average'] if 170 <= c <= 190 else colors['poor'] 
                     for c in df['cadence']]
        ax2.scatter(df['distance']/1000, df['cadence'], c=cad_colors, alpha=0.6, s=8)
        ax2.axhline(y=180, color='green', linestyle='--', linewidth=2)
        ax2.set_title('Cadence (SPM)')
        ax2.set_ylim(165, 195)
        
        # 3. Stride Length
        ax3 = fig.add_subplot(gs[0, 2])
        ax3.scatter(df['distance']/1000, df['stride_length'], alpha=0.6, s=8, color='purple')
        ax3.axhline(y=1.8, color='green', linestyle='--', linewidth=2)
        ax3.set_title('Stride Length (m)')
        
        # 4. Efficiency Gauge
        ax4 = fig.add_subplot(gs[0, 3])
        ax4 = fig.add_axes([0.78, 0.68, 0.2, 0.25], projection='polar')
        theta = np.linspace(0, np.pi, 100)
        ax4.fill_between(theta, 0, np.ones(100), alpha=0.1, color='gray')
        score_angle = (avg_efficiency / 100) * np.pi
        score_color = colors['good'] if avg_efficiency >= 80 else colors['average'] if avg_efficiency >= 65 else colors['poor']
        ax4.fill_between(np.linspace(0, score_angle, 50), 0, np.ones(50), alpha=0.9, color=score_color)
        ax4.plot([0, score_angle], [0, 0.8], color='black', linewidth=3)
        ax4.text(np.pi/2, 0.5, f'{avg_efficiency:.0f}', ha='center', va='center', fontsize=28, fontweight='bold')
        ax4.text(np.pi/2, 0.3, 'EFFICIENCY', ha='center', va='center', fontsize=10)
        ax4.set_ylim(0, 1)
        ax4.set_xticks([0, np.pi/2, np.pi])
        ax4.set_xticklabels(['0', '50', '100'])
        ax4.set_yticks([])
        
        # 5. Vertical Oscillation
        ax5 = fig.add_subplot(gs[1, 0])
        vo_colors = [colors['good'] if vo < 8 else colors['average'] if vo < 10 else colors['poor'] for vo in df['vertical_oscillation']]
        ax5.scatter(df['distance']/1000, df['vertical_oscillation'], c=vo_colors, alpha=0.6, s=8)
        ax5.axhline(y=8, color='green', linestyle='--', linewidth=2)
        ax5.set_title('Vertical Oscillation (cm)')
        ax5.set_ylim(5, 12)
        
        # 6. Ground Contact Time
        ax6 = fig.add_subplot(gs[1, 1])
        gct_colors = [colors['good'] if g < 220 else colors['average'] if g < 250 else colors['poor'] for g in df['ground_contact_time']]
        ax6.scatter(df['distance']/1000, df['ground_contact_time'], c=gct_colors, alpha=0.6, s=8)
        ax6.axhline(y=220, color='green', linestyle='--', linewidth=2)
        ax6.set_title('Ground Contact Time (ms)')
        ax6.set_ylim(180, 280)
        
        # 7. GCT Balance
        ax7 = fig.add_subplot(gs[1, 2])
        ax7.hist(df['ground_contact_balance'], bins=40, color='skyblue', alpha=0.7, edgecolor='black')
        ax7.axvline(x=0, color='green', linestyle='--', linewidth=2)
        ax7.axvline(x=np.mean(df['ground_contact_balance']), color='red', linestyle='-', linewidth=2)
        ax7.axvspan(-1.5, 1.5, alpha=0.2, color='green')
        ax7.set_title('GCT Balance Distribution')
        
        # 8. Efficiency Trend
        ax8 = fig.add_subplot(gs[1, 3])
        eff_colors = [colors['good'] if e >= 80 else colors['average'] if e >= 65 else colors['poor'] for e in df['efficiency_score']]
        ax8.scatter(df['distance']/1000, df['efficiency_score'], c=eff_colors, alpha=0.6, s=8)
        ax8.plot(df['distance']/1000, df['efficiency_score'].rolling(200).mean(), color='black', linewidth=2)
        ax8.axhline(y=80, color='green', linestyle='--', alpha=0.7)
        ax8.set_title('Efficiency Score Trend')
        ax8.set_ylim(0, 100)
        
        # 9. Correlation Matrix
        ax9 = fig.add_subplot(gs[2, 0])
        corr_data = df[['pace', 'cadence', 'stride_length', 'vertical_oscillation', 'ground_contact_time']].corr()
        im = ax9.imshow(corr_data, cmap='RdYlGn', aspect='auto', vmin=-1, vmax=1)
        ax9.set_xticks(range(len(corr_data.columns)))
        ax9.set_yticks(range(len(corr_data.columns)))
        ax9.set_xticklabels(['Pace', 'Cad', 'Stride', 'VO', 'GCT'], rotation=45)
        ax9.set_yticklabels(['Pace', 'Cad', 'Stride', 'VO', 'GCT'])
        ax9.set_title('Dynamics Correlation')
        plt.colorbar(im, ax=ax9, fraction=0.046)
        
        # 10. Pace vs Cadence
        ax10 = fig.add_subplot(gs[2, 1])
        scatter = ax10.scatter(df['cadence'], df['pace']/60, c=df['efficiency_score'], cmap='RdYlGn', alpha=0.6)
        ax10.set_title('Pace vs Cadence')
        ax10.set_xlabel('Cadence (SPM)')
        ax10.set_ylabel('Pace (min/km)')
        ax10.invert_yaxis()
        plt.colorbar(scatter, ax=ax10)
        
        # 11. Form Factors
        ax11 = fig.add_subplot(gs[2, 2])
        ax11.pie(form_analysis.values(), labels=form_analysis.keys(), autopct='%1.1f%%',
                colors=['#1dd1a1', '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'])
        ax11.set_title('Form Factor Distribution')
        
        # 12. Summary
        ax12 = fig.add_subplot(gs[2, 3])
        ax12.axis('off')
        
        summary = f'''
        RUNNING DYNAMICS REPORT
        
        Distance: {df['distance'].max()/1000:.2f} km
        Duration: {df['time'].max()/60:.1f} min
        Avg Pace: {df['pace'].mean()/60:.2f} min/km
        Avg HR: {df['heart_rate'].mean():.0f} BPM
        
        Biomechanics:
        • Cadence: {df['cadence'].mean():.0f} SPM
        • Stride: {df['stride_length'].mean():.2f} m
        • VO: {df['vertical_oscillation'].mean():.1f} cm
        • GCT: {df['ground_contact_time'].mean():.0f} ms
        • Balance: {df['ground_contact_balance'].mean():.1f}%
        
        Efficiency: {avg_efficiency:.0f}/100
        Grade: {grade}
        
        {"Excellent form!" if grade in ['A+', 'A'] else "Good with room to improve" if grade == 'B' else "Focus on form drills"}
        '''
        
        grade_color = '#4caf50' if grade in ['A+', 'A'] else '#8bc34a' if grade == 'B' else '#ff9800' if grade == 'C' else '#f44336'
        ax12.text(0.05, 0.95, summary, transform=ax12.transAxes, fontsize=10,
                 verticalalignment='top', fontfamily='monospace',
                 bbox=dict(boxstyle='round', facecolor=grade_color, alpha=0.3))
        
        chart_base64 = self._fig_to_base64(fig)
        
        return {
            'chart': chart_base64,
            'efficiency_score': avg_efficiency,
            'grade': grade,
            'form_analysis': form_analysis,
            'metrics': {
                'avg_cadence': df['cadence'].mean(),
                'avg_stride': df['stride_length'].mean(),
                'avg_vo': df['vertical_oscillation'].mean(),
                'avg_gct': df['ground_contact_time'].mean(),
                'avg_pace': df['pace'].mean()
            }
        }
    
    # ==================== TRIATHLON ANALYSIS ====================
    
    def create_triathlon_analysis(self, tri_data: Dict) -> Dict:
        """
        Create comprehensive triathlon race analysis
        
        Required structure:
        {
            'swim': {'distance': 1500, 'time': 1590, 'heart_rate_avg': 152, ...},
            't1': {'time': 128, 'breakdown': {...}},
            'bike': {'distance': 40000, 'time': 4125, 'normalized_power': 205, ...},
            't2': {'time': 95, 'breakdown': {...}},
            'run': {'distance': 10000, 'time': 2780, 'splits': [...], ...}
        }
        
        Returns:
            Dict with 'chart' (base64), 'total_time', 'splits', 'grade', 'recommendations'
        """
        
        labels = ['Swim', 'T1', 'Bike', 'T2', 'Run']
        times = [tri_data['swim']['time'], tri_data['t1']['time'], 
                tri_data['bike']['time'], tri_data['t2']['time'], tri_data['run']['time']]
        times_min = [t/60 for t in times]
        cumulative = sum(times_min)
        
        # Calculate run fade
        run_splits = tri_data['run']['splits']
        first_half = np.mean(run_splits[:5])
        second_half = np.mean(run_splits[5:])
        fade_pct = ((second_half - first_half) / first_half) * 100
        
        # Determine grade
        if cumulative < 130:
            grade = 'A'
        elif cumulative < 150:
            grade = 'B'
        elif cumulative < 170:
            grade = 'C'
        else:
            grade = 'D'
        
        # Generate recommendations
        recommendations = []
        if fade_pct > 5:
            recommendations.append("Manage run fade - start bike-to-run transition easier")
        if times_min[1] > 3:
            recommendations.append("Practice T1 wetsuit removal")
        if times_min[3] > 2:
            recommendations.append("Speed up T2 transition")
        if tri_data['bike']['if'] > 0.85:
            recommendations.append("Bike leg too hard - reduce intensity")
        
        # Create dashboard
        fig = plt.figure(figsize=(20, 14))
        fig.suptitle('Triathlon Race Analysis', fontsize=18, fontweight='bold')
        gs = fig.add_gridspec(3, 4, hspace=0.4, wspace=0.35)
        
        colors = self.colors
        
        # 1. Race Timeline
        ax1 = fig.add_subplot(gs[0, :])
        cum = 0
        for i, (label, time, color) in enumerate(zip(labels, times_min,
                                                      [colors['swim'], colors['t1'], colors['bike'], colors['t2'], colors['run']])):
            ax1.barh(0, time, left=cum, color=color, alpha=0.85, edgecolor='black', linewidth=2)
            if time > 3:
                ax1.text(cum + time/2, 0, f'{label}\\n{time:.1f}min', 
                        ha='center', va='center', fontweight='bold', fontsize=11)
            cum += time
        ax1.set_xlim(0, cum * 1.05)
        ax1.set_title('Race Timeline')
        ax1.set_yticks([])
        
        # 2. Discipline Times
        ax2 = fig.add_subplot(gs[1, 0])
        sports = ['Swim', 'Bike', 'Run']
        sport_times = [times_min[0], times_min[2], times_min[4]]
        ax2.bar(sports, sport_times, color=[colors['swim'], colors['bike'], colors['run']], alpha=0.8)
        ax2.set_title('Time by Discipline')
        
        # 3. T1 Breakdown
        ax3 = fig.add_subplot(gs[1, 1])
        t1_times = list(tri_data['t1']['breakdown'].values())
        ax3.pie(t1_times, labels=None, colors=plt.cm.Set3.colors)
        ax3.set_title(f'T1 Breakdown ({times_min[1]:.1f}min)')
        
        # 4. Bike Power
        ax4 = fig.add_subplot(gs[1, 2])
        time_points = np.linspace(0, times_min[2], 100)
        power = tri_data['bike']['normalized_power'] + np.sin(time_points/8)*15
        ax4.fill_between(time_points, power, alpha=0.3, color=colors['bike'])
        ax4.plot(time_points, power, color=colors['bike'])
        ax4.axhline(y=250, color='red', linestyle='--', label='FTP')
        ax4.set_title('Bike Power')
        ax4.legend()
        
        # 5. Run Splits
        ax5 = fig.add_subplot(gs[1, 3])
        km_points = list(range(1, len(run_splits) + 1))
        split_colors = ['#4caf50' if i < 5 else '#ff9800' if run_splits[i] < first_half * 1.05 else '#f44336' 
                       for i in range(len(run_splits))]
        ax5.bar(km_points, [s/60 for s in run_splits], color=split_colors, alpha=0.8)
        ax5.set_title(f'Run Splits (+{fade_pct:.1f}% fade)')
        
        # 6. HR by Discipline
        ax6 = fig.add_subplot(gs[2, 0])
        hrs = [tri_data['swim']['heart_rate_avg'], tri_data['bike']['heart_rate_avg'], tri_data['run']['heart_rate_avg']]
        ax6.bar(['Swim', 'Bike', 'Run'], hrs, color=[colors['swim'], colors['bike'], colors['run']], alpha=0.8)
        ax6.set_title('Heart Rate')
        
        # 7. Transitions
        ax7 = fig.add_subplot(gs[2, 1])
        ax7.bar(['T1', 'T2'], [times_min[1], times_min[3]], color=[colors['t1'], colors['t2']], alpha=0.8)
        ax7.axhspan(0, 2, alpha=0.2, color='green')
        ax7.set_title('Transition Times')
        
        # 8. Performance Comparison
        ax8 = fig.add_subplot(gs[2, 2])
        x = np.arange(3)
        ax8.bar(x - 0.25, [20, 58, 32], 0.25, label='Elite', color='gold')
        ax8.bar(x, [times_min[0], times_min[2], times_min[4]], 0.25, label='You', color='purple')
        ax8.set_title('vs Elite Times')
        ax8.set_xticks(x)
        ax8.set_xticklabels(['Swim', 'Bike', 'Run'])
        ax8.legend()
        
        # 9. Summary
        ax9 = fig.add_subplot(gs[2, 3])
        ax9.axis('off')
        
        hours = int(cumulative // 60)
        mins = int(cumulative % 60)
        
        summary = f'''
        TRIATHLON RACE REPORT
        
        Total: {hours}:{mins:02d}
        
        Splits:
        • Swim: {times_min[0]:.1f}min
        • T1: {times_min[1]:.1f}min
        • Bike: {times_min[2]:.1f}min
        • T2: {times_min[3]:.1f}min
        • Run: {times_min[4]:.1f}min
        
        Fade: +{fade_pct:.1f}%
        Grade: {grade}
        
        {chr(10).join(recommendations) if recommendations else "Great race!"}
        '''
        
        ax9.text(0.05, 0.95, summary, transform=ax9.transAxes, fontsize=10,
                verticalalignment='top', fontfamily='monospace',
                bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.3))
        
        chart_base64 = self._fig_to_base64(fig)
        
        return {
            'chart': chart_base64,
            'total_time': cumulative,
            'total_time_formatted': f"{hours}:{mins:02d}",
            'splits': {
                'swim': times_min[0], 't1': times_min[1], 'bike': times_min[2],
                't2': times_min[3], 'run': times_min[4]
            },
            'run_fade_percent': fade_pct,
            'grade': grade,
            'recommendations': recommendations
        }
    
    def _fig_to_base64(self, fig) -> str:
        """Convert figure to base64"""
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        return img_base64
