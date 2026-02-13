# Coach-AI Advanced Charts Documentation

## 🎯 Overview

This package provides professional-grade data visualization for Garmin Connect data,
supporting Running, Cycling (with Power), and Swimming analytics.

## 📊 Available Chart Types

### 1. **Cycling Power Analysis** (8 Charts)

| Chart | Description | Metrics |
|-------|-------------|---------|
| **Power Curve** | Time-series power output with zone colors | Watts, FTP, NP |
| **Zone Distribution** | Time spent in each power zone | Minutes, % |
| **Power vs HR** | Cardiac drift and aerobic efficiency | W vs BPM |
| **Quadrant Analysis** | Force (Power) vs Cadence patterns | RPM, W |
| **MMP Curve** | Mean Maximal Power duration curve | Peak power by duration |
| **Power Profile** | Radar chart of power across durations | 5s, 1min, 5min, 20min, 60min |
| **Variability Index** | Rolling NP/AVG ratio | VI over time |
| **Summary Stats** | Key workout metrics | TSS, IF, kJ, etc. |

**Key Metrics Explained:**
- **FTP**: Functional Threshold Power (1-hour max)
- **NP**: Normalized Power (accounts for variability)
- **TSS**: Training Stress Score (overall load)
- **IF**: Intensity Factor (NP/FTP)
- **VI**: Variability Index (NP/AVG, >1.05 = variable)

### 2. **Swimming Analysis** (6 Charts)

| Chart | Description | Metrics |
|-------|-------------|---------|
| **Pace per Lap** | Lap-by-lap pace with section colors | sec/100m |
| **Interval Consistency** | Pace consistency across repeats | Avg pace per interval |
| **Stroke Efficiency** | SR vs DPS relationship | spm, m/stroke |
| **SWOLF Analysis** | Swim golf score trends | Time + Strokes |
| **Heart Rate** | HR during swim | BPM |
| **Summary** | Key swim metrics | Distance, time, efficiency |

**Key Metrics Explained:**
- **DPS**: Distance Per Stroke (efficiency indicator)
- **SWOLF**: Swim Golf = Time(sec) + Stroke Count (lower = better)
- **SR**: Stroke Rate (strokes per minute)
- **Pace Consistency**: Standard deviation of pace (lower = more consistent)

### 3. **General Performance** (9 Charts)

From original `garmin_charts.py`:
- Training Load (CTL/ATL/TSB)
- Recovery Status
- Sleep Analysis
- Heart Rate Trends
- Weekly Summary
- VO2Max Progression
- Activity Distribution
- Correlation Matrix

## 🚀 Quick Start

### Installation

```bash
pip install garminconnect matplotlib pandas numpy
```
