import logging
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.models import DailyMetric

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MetricsEngine:
    def __init__(self, db: Session):
        self.db = db

    def calculate_tss(self, duration_sec, avg_hr, max_hr, activity_type="running", ftp=None, power=None):
        """
        Calculate Training Stress Score (TSS) for a single activity.
        Simplified version based on HR if Power is not available.
        """
        if not duration_sec or duration_sec <= 0:
            return 0
        
        # 1. Power-based TSS (Cycling) if available
        if power and ftp and ftp > 0:
            # TSS = (sec x NP x IF) / (FTP x 3600) x 100
            # Simplified: using avg power as NP estimate for now
            intensity_factor = power / ftp
            return (duration_sec * power * intensity_factor) / (ftp * 3600) * 100

        # 2. HR-based TSS (Running/General)
        # trimp = duration_min * ratio * 0.64 * exp(1.92 * ratio)
        if avg_hr and max_hr and max_hr > 0:
            duration_min = duration_sec / 60
            hr_reserve = (avg_hr - 40) / (max_hr - 40) # Assumed RHR 40 for reserve calc if unknown
            # Simple HRTSS estimate: 
            # 1 hour at Threshold (approx 90% max HR) = 100 TSS
            # This is a linear approximation for now
            intensity = avg_hr / max_hr
            # Squaring intensity generally maps better to physiological stress
            return (duration_min / 60) * (intensity ** 2) * 100 * 1.5 
            # Multiplier 1.5 brings steady state runs closer to realistic TSS values compared to straight linear
            
        return 0

    def update_fitness_fatigue(self, user_id, target_date_str):
        """
        Recalculate CTL/ATL/TSB for a specific date based on history.
        Uses exponential weighted moving average.
        """
        # 1. Fetch history up to yesterday
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        yesterday = (target_date - timedelta(days=1)).isoformat()
        
        prev_metric = self.db.query(DailyMetric).filter(
            DailyMetric.user_id == user_id, 
            DailyMetric.date == yesterday
        ).first()

        # Get today's metric entry
        today_metric = self.db.query(DailyMetric).filter(
            DailyMetric.user_id == user_id, 
            DailyMetric.date == target_date_str
        ).first()
        
        if not today_metric:
            today_metric = DailyMetric(user_id=user_id, date=target_date_str)
            self.db.add(today_metric)

        daily_tss = today_metric.total_tss or 0

        # Constants
        ATL_DAYS = 7
        CTL_DAYS = 42

        if prev_metric and prev_metric.ctl is not None:
            # Calculate new values
            # CTL_today = CTL_yesterday + (TSS_today - CTL_yesterday) * (1/CTL_DAYS)
            new_ctl = prev_metric.ctl + (daily_tss - prev_metric.ctl) * (1/CTL_DAYS)
            new_atl = prev_metric.atl + (daily_tss - prev_metric.atl) * (1/ATL_DAYS)
        else:
            # Initialize if no history (approximate)
            new_ctl = daily_tss
            new_atl = daily_tss

        new_tsb = new_ctl - new_atl

        # Update DB
        today_metric.ctl = round(new_ctl, 1)
        today_metric.atl = round(new_atl, 1)
        today_metric.tsb = round(new_tsb, 1)
        
        self.db.commit()
        return today_metric

    def backfill_history(self, user_id, start_date_str, end_date_str=None):
        """
        Iterate through a date range and calculate metrics sequentially.
        """
        if not end_date_str:
            end_date_str = datetime.now().strftime("%Y-%m-%d")

        start = datetime.strptime(start_date_str, "%Y-%m-%d")
        end = datetime.strptime(end_date_str, "%Y-%m-%d")
        
        current = start
        while current <= end:
            self.update_fitness_fatigue(user_id, current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)

    def assess_recovery(self, date_str):
        """
        Determine recovery status (Green/Yellow/Red) based on DailyMetric.
        """
        metric = self.db.query(DailyMetric).filter(DailyMetric.date == date_str).first()
        if not metric:
            return "unknown", "No data"

        score = 0
        reasons = []

        # 1. Sleep (30%)
        if metric.sleep_score:
            if metric.sleep_score >= 80: score += 30
            elif metric.sleep_score >= 60: score += 15
            else: reasons.append("Poor sleep")

        # 2. Body Battery (30%)
        if metric.body_battery_max:
             if metric.body_battery_max >= 80: score += 30
             elif metric.body_battery_max >= 60: score += 15
             else: reasons.append("Low body battery")

        # 3. TSB / Form (20%)
        if metric.tsb is not None:
            if metric.tsb > -10: score += 20
            elif metric.tsb > -30: score += 10
            else: reasons.append("High training fatigue (low TSB)")

        # 4. Stress (20%)
        if metric.stress_score:
            if metric.stress_score < 40: score += 20
            elif metric.stress_score < 60: score += 10
            else: reasons.append("High stress levels")

        if score >= 70:
            return "Green", "Fully Recovered"
        elif score >= 40:
            return "Yellow", f"Moderate Fatigue ({', '.join(reasons)})"
        else:
            return "Red", f"High Fatigue ({', '.join(reasons)})"
