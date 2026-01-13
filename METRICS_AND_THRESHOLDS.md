# SystemPulse - Metrics and Thresholds Documentation

## Performance Scoring System

### Overall Performance Levels
- **LOW**: Score ≥ 2
- **MEDIUM**: Score < 2 (default)
- **HIGH**: Score < 1.5 AND all high-performance criteria met

### Score Calculation
Each issue adds 1 point to the score. Maximum score is 5.

---

## Core Metrics & Thresholds

### 1. CPU Cores
**Metric**: Physical CPU cores detected

**Scoring Thresholds:**
- **Low CPU Cores** (adds 1 point): < 6 cores
- **High Performance Criteria**: ≥ 8 cores

**Status Indicators (UI):**
- 🟢 **Good**: ≥ 8 cores
- 🟡 **Warning**: 6-7 cores
- 🔴 **Bad**: < 6 cores

**Fallback**: 2 cores (if hardwareConcurrency not available)

---

### 2. RAM (Device Memory)
**Metric**: Device memory in GB

**Scoring Thresholds:**
- **Low Memory** (adds 1 point): ≤ 4 GB
- **High Performance Criteria**: ≥ 8 GB
- **Memory Capped**: Browser reports 8GB (actual RAM likely higher)

**Status Indicators (UI):**
- 🟢 **Good**: ≥ 8 GB or capped (8GB+)
- 🟡 **Warning**: > 4 GB and < 8 GB (5-7 GB)
- 🔴 **Bad**: ≤ 4 GB
- ⚪ **Neutral**: Not available

**Detection Methods:**
1. **Primary**: `navigator.deviceMemory` API (when available)
2. **iOS Fallback**: User-agent parsing to detect iPhone models (iPhone 7 through iPhone 15 Pro Max)
   - Safari on iOS doesn't expose `deviceMemory` API for privacy reasons
   - Falls back to model detection from user agent when API unavailable
   - If detection fails, shows "Not Available (iOS)" and doesn't penalize score

**Note**: 
- Browsers cap memory reporting at 8GB for privacy/anti-fingerprinting
- iOS devices: If RAM cannot be detected, score is not penalized (unknown ≠ low)

---

### 3. GPU (Graphics Processing Unit)

#### GPU Detection
**Weak GPU Patterns** (adds 1 point if detected):
- Intel integrated graphics
- Mali GPUs
- Adreno 3, 4, 5
- PowerVR

**Software Renderer Patterns** (treated as no GPU):
- Microsoft Basic Render Driver
- Software Renderer
- llvmpipe / Mesa llvmpipe
- SwiftShader
- Software Rasterizer
- Chromium Software Renderer
- CPU rendering

#### GPU Quality Thresholds
**Minimum Texture Size**: 4096px
**Minimum Vertex Uniform Vectors**: 1024

**Scoring:**
- **Weak GPU** (adds 1 point): 
  - Texture size < 4096px OR
  - Vertex uniform vectors < 1024 OR
  - Matches weak GPU pattern

**Status Indicators (UI):**
- 🟢 **Good**: Discrete GPU, good performance
- 🟡 **Warning**: Integrated/weak GPU
- 🔴 **Bad**: No GPU detected

**High Performance Criteria**: Not a weak GPU

---

### 4. Compute Delay (CPU Benchmark)
**Metric**: Stable duration of CPU benchmark in milliseconds

**Benchmark Details:**
- **Rounds**: 11 runs (increased from 7 for better statistical accuracy)
- **Minimum Valid Results**: 5 required
- **Method**: 
  - Low variance (< 10%): Uses trimmed mean (removes top/bottom 25%)
  - Moderate variance (10-25%): Uses median
  - High variance (> 25%): Uses median
- **Outlier Detection**: IQR method (removes values outside Q1 - 1.5×IQR or Q3 + 1.5×IQR)
- **Variance Adjustments**:
  - Coefficient of variation > 15%: Threshold increased by 50% (18ms → 27ms)
  - Coefficient of variation > 25%: Threshold increased by 75% (18ms → 31.5ms)

**Scoring Thresholds:**
- **Slow Device** (adds 1 point): Duration > threshold
- **Standard Threshold**: 18ms
- **Adjusted Threshold** (high variance >15%): 27ms (18ms × 1.5)
- **Adjusted Threshold** (very high variance >25%): 31.5ms (18ms × 1.75)

**Status Indicators (UI):**
- 🟢 **Good**: ≤ 12ms
- 🟡 **Warning**: 13-18ms
- 🔴 **Bad**: > 18ms

---

### 5. Refresh Rate
**Metric**: Display refresh rate in Hz (estimated)

**Scoring Thresholds:**
- **High Performance Criteria**: ≥ 90 Hz

**Status Indicators (UI):**
- 🟢 **Good**: ≥ 90 Hz
- 🟡 **Warning**: 60-89 Hz
- 🔴 **Bad**: < 60 Hz
- ⚪ **Neutral**: Not available

---

### 6. Battery Level
**Metric**: Battery percentage (0-100%)

**Scoring Thresholds:**
- **Throttled State** (adds 1 point): < 20% AND not charging

**Status Indicators (UI):**
- 🟢 **Good**: Charging OR ≥ 50%
- 🟡 **Warning**: 20-49%
- 🔴 **Bad**: < 20%
- ⚪ **Neutral**: Not supported/blocked

---

### 7. Network Connection

#### Connection Type
**Status Indicators (UI):**
- 🟢 **Good**: 4G
- 🟡 **Warning**: 3G
- 🔴 **Bad**: 2G or Offline
- ⚪ **Neutral**: Unknown type

#### Downlink Speed
**Metric**: Network downlink speed in Mbps

**Status Indicators (UI):**
- 🟢 **Good**: ≥ 10 Mbps
- 🟡 **Warning**: 5-9 Mbps
- 🔴 **Bad**: < 5 Mbps
- ⚪ **Neutral**: Not available

---

### 8. Storage
**Metric**: Storage quota and usage in GB

**Status Indicators**: Not used in scoring, informational only

---

## High Performance Criteria (All Must Be Met)

To achieve **HIGH** performance level:
1. ✅ CPU Cores ≥ 8
2. ✅ RAM ≥ 8 GB
3. ✅ Not a weak GPU
4. ✅ Refresh Rate ≥ 90 Hz
5. ✅ Score < 1.5

---

## Summary Table

| Metric | Low Threshold | High Threshold | Score Impact |
|--------|--------------|----------------|--------------|
| CPU Cores | < 6 cores | ≥ 8 cores | +1 if low |
| RAM | ≤ 4 GB | ≥ 8 GB | +1 if low |
| GPU | Weak/None | Discrete, good | +1 if weak |
| Compute Delay | > 18ms (or 27ms/31.5ms if high variance) | ≤ 18ms | +1 if slow |
| Battery | < 20% (not charging) | N/A | Informational only |
| Refresh Rate | N/A | ≥ 90 Hz | Required for HIGH |
| Network | N/A | N/A | No impact |

---

## Notes

- **Score Range**: 0-4 (each issue adds 1 point)
- **Performance Level**:
  - Score ≥ 2 → LOW
  - Score < 2 → MEDIUM (default)
  - Score < 1.5 + all HIGH criteria → HIGH
- **Benchmark Stability**: 
  - 11 rounds for better statistical accuracy
  - Uses IQR method for outlier detection
  - Uses median or trimmed mean based on variance
- **Variance Handling**: 
  - Coefficient of variation > 15%: Threshold increased by 50% (18ms → 27ms)
  - Coefficient of variation > 25%: Threshold increased by 75% (18ms → 31.5ms)
  - Prevents false positives from background processes or thermal throttling
- **iOS Support**: 
  - RAM detection via user-agent parsing for iPhone models
  - Unknown RAM on iOS doesn't penalize score (privacy limitation, not device capability)

