# Metrics Specification for Device Diagnostics

## Overview
This document defines which metrics should be used for device performance assessment and how they should be calculated.

---

## Metrics Used for LOW Performance Detection (Score ≥ 2 = LOW)

### 1. **CPU Cores** ⭐⭐⭐⭐⭐
**Status**: ✅ **KEEP** - Critical metric

**How it works**:
- Detects physical CPU cores (handles Apple Silicon vs x86 hyperthreading)
- **Threshold**: < 6 cores = +1 point
- **Detection Logic**:
  - Apple Silicon: Uses `hardwareConcurrency` directly (no hyperthreading)
  - x86 CPUs: Estimates physical cores (handles hyperthreading patterns)
  - Conservative approach: Only divides by 2 for high core counts (≥16) that are clearly hyperthreaded

**Why**: Core count directly correlates with multitasking and parallel processing capability. Devices with < 6 cores struggle with modern apps.

**Current Implementation**: ✅ Working correctly

---

### 2. **RAM (Device Memory)** ⭐⭐⭐⭐⭐
**Status**: ✅ **KEEP** - Critical metric

**How it works**:
- **Primary Method**: Detects device memory via `navigator.deviceMemory` API
- **iOS Fallback**: User-agent parsing to detect iPhone models (iPhone 7 through iPhone 15 Pro Max)
  - Safari on iOS doesn't expose `deviceMemory` API for privacy reasons
  - Falls back to model detection from user agent when API unavailable
  - If detection fails, shows "Not Available (iOS)" and doesn't penalize score
- **Threshold**: ≤ 4 GB = +1 point
- **Browser Limitation**: Memory reporting capped at 8GB (privacy)
- **Display**: Shows "8+ GB (Capped)" when capped, "Not Available (iOS)" on iOS when undetectable

**Why**: RAM is critical for app performance and multitasking. ≤ 4 GB causes constant app reloading and slow performance.

**Current Implementation**: ✅ Working correctly (with iOS fallback detection)

---

### 3. **Compute Delay (CPU Benchmark)** ⭐⭐⭐⭐⭐
**Status**: ✅ **KEEP** - Most important metric

**How it works**:
- Runs 11 rounds of CPU benchmarks (increased from 7 for better statistical accuracy)
- Requires minimum 5 valid results
- **Outlier Detection**: IQR method (removes values outside Q1 - 1.5×IQR or Q3 + 1.5×IQR)
- **Statistical Method**:
  - Low variance (< 10%): Uses trimmed mean (removes top/bottom 25%)
  - Moderate variance (10-25%): Uses median
  - High variance (> 25%): Uses median
- **Variance Adjustments**:
  - Coefficient of variation > 15%: Threshold increased by 50% (18ms → 27ms)
  - Coefficient of variation > 25%: Threshold increased by 75% (18ms → 31.5ms)
- **Threshold**: > 18ms = +1 point

**Why**: Measures actual CPU performance, not just specs. Accounts for thermal throttling and background processes. Most accurate real-world performance indicator.

**Current Implementation**: ✅ Working correctly (with advanced variance detection and outlier removal)

---

### 4. **GPU Performance** ⭐⭐⭐⭐
**Status**: ✅ **KEEP** - Important for modern use cases

**How it works**:
- Detects GPU via WebGL
- Filters out software renderers (Microsoft Basic Render Driver, llvmpipe, SwiftShader, etc.)
- Checks texture size and vertex uniform vectors
- **Weak GPU Detection**:
  - Texture size < 4096px OR
  - Vertex uniform vectors < 1024 OR
  - Known weak GPU patterns (Intel integrated, Mali, Adreno 3/4/5, PowerVR)
- **Threshold**: Weak GPU = +1 point

**Why**: Important for graphics-intensive tasks, gaming, video processing. Weak GPU indicates low-end device.

**Current Implementation**: ✅ Working correctly (with software renderer filtering)

---

### 5. **Battery Level** ⭐
**Status**: ✅ **REMOVED FROM LOW SCORE** - Not a device capability indicator

**Current Behavior**:
- Low battery (< 20%) + Not charging = Informational only (throttledState flag)
- **Not used in score calculation** ✅
- **Problem Solved**: Battery level indicates temporary throttling state, not device capability
- A high-end device with low battery ≠ low-end device

**Implementation**: 
- ✅ **Removed from LOW score calculation**
- ✅ Kept in display (informational only)
- ✅ Used for throttling warnings, but not for device capability assessment

**Why Removed**: Battery level is temporary state, not inherent device capability. Prevents false positives.

---

## Metrics Used for HIGH Performance Detection

### 6. **Refresh Rate** ⭐⭐⭐
**Status**: ✅ **KEEP FOR HIGH ONLY** - Not for LOW detection

**How it works**:
- Estimates display refresh rate via `requestAnimationFrame`
- **Threshold**: ≥ 90 Hz required for HIGH performance
- **Not used for LOW score** (correctly excluded)

**Why**: Affects perceived smoothness, but doesn't indicate device speed. Premium feature indicator.

**Current Implementation**: ✅ Correctly only used for HIGH performance

---

## Metrics NOT Used for Scoring (Informational Only)

### 7. **Network Connection** ⭐
**Status**: ✅ **CORRECTLY EXCLUDED**

**Why**: Network speed ≠ device performance. Correctly not included in scoring.

**Current Implementation**: ✅ Displayed but not scored

---

### 8. **Storage** ⭐
**Status**: ✅ **INFORMATIONAL ONLY**

**Why**: Storage quota doesn't indicate device performance. Useful for debugging but not for capability assessment.

**Current Implementation**: ✅ Displayed but not scored

---

## Recommended Changes

### Primary Change: Remove Battery from LOW Score

**Current Scoring System**:
- CPU Cores (< 6) = +1
- RAM (≤ 4 GB) = +1
- Weak GPU = +1
- Slow Compute Delay (> 8ms) = +1
- Low Battery (< 20% + not charging) = +1
- **Total**: 5 metrics can contribute
- **Threshold**: Score ≥ 2 = LOW

**Current Scoring System** (Implemented):
- CPU Cores (< 6) = +1
- RAM (≤ 4 GB) = +1
- Weak GPU = +1
- Slow Compute Delay (> 18ms) = +1
- ~~Low Battery~~ = **REMOVED** ✅
- **Total**: 4 metrics can contribute
- **Threshold**: Score ≥ 2 = LOW (unchanged)

**Rationale**: Battery level indicates temporary throttling, not device capability. A flagship device with low battery shouldn't be marked as "low-end."

---

## Summary: Final Metrics List

### For LOW Performance Detection (Score ≥ 2):
1. ✅ **CPU Cores** (< 6 cores) - +1 point
2. ✅ **RAM** (≤ 4 GB) - +1 point
3. ✅ **Compute Delay** (> 18ms) - +1 point
4. ✅ **GPU** (Weak GPU) - +1 point
5. ✅ **Battery** - **REMOVED** ✅ (temporary state, not capability)

### For HIGH Performance Detection:
1. ✅ **CPU Cores** (≥ 8 cores)
2. ✅ **RAM** (≥ 8 GB)
3. ✅ **GPU** (Not weak)
4. ✅ **Refresh Rate** (≥ 90 Hz)

### Informational Only (Not Scored):
- Network Connection
- Storage
- Battery (after removal from score)

---

## Implementation Status

1. ✅ **Battery removed from LOW score calculation** (Completed)
2. ✅ **Compute Delay threshold updated to 18ms** (Completed)
3. ✅ **Benchmark rounds increased to 11** (Completed)
4. ✅ **iOS RAM detection fallback implemented** (Completed)
5. ✅ **Advanced variance detection and outlier removal** (Completed)
6. ✅ Battery remains in display for informational purposes (Completed)

