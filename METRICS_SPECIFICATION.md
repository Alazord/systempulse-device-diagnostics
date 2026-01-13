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
- Detects device memory via `navigator.deviceMemory`
- **Threshold**: ≤ 4 GB = +1 point
- **Browser Limitation**: Memory reporting capped at 8GB (privacy)
- **Display**: Shows "8+ GB (Capped)" when capped

**Why**: RAM is critical for app performance and multitasking. ≤ 4 GB causes constant app reloading and slow performance.

**Current Implementation**: ✅ Working correctly

---

### 3. **Compute Delay (CPU Benchmark)** ⭐⭐⭐⭐⭐
**Status**: ✅ **KEEP** - Most important metric

**How it works**:
- Runs 7 rounds of CPU benchmarks
- Calculates median with variance detection
- Uses trimmed mean if variance > 15%
- Adjusts threshold by 50% if coefficient of variation > 20%
- **Threshold**: > 8ms = +1 point

**Why**: Measures actual CPU performance, not just specs. Accounts for thermal throttling and background processes. Most accurate real-world performance indicator.

**Current Implementation**: ✅ Working correctly (with variance detection)

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
**Status**: ❌ **REMOVE FROM LOW SCORE** - Not a device capability indicator

**Current Behavior**:
- Low battery (< 20%) + Not charging = +1 point
- **Problem**: Battery level indicates temporary throttling state, not device capability
- A high-end device with low battery ≠ low-end device

**Recommendation**: 
- **Remove from LOW score calculation**
- Keep in display (informational only)
- Can be used for throttling warnings, but not for device capability assessment

**Why Remove**: Battery level is temporary state, not inherent device capability. Causes false positives.

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

**Proposed Scoring System**:
- CPU Cores (< 6) = +1
- RAM (≤ 4 GB) = +1
- Weak GPU = +1
- Slow Compute Delay (> 8ms) = +1
- ~~Low Battery~~ = **REMOVED**
- **Total**: 4 metrics can contribute
- **Threshold**: Score ≥ 2 = LOW (unchanged)

**Rationale**: Battery level indicates temporary throttling, not device capability. A flagship device with low battery shouldn't be marked as "low-end."

---

## Summary: Final Metrics List

### For LOW Performance Detection (Score ≥ 2):
1. ✅ **CPU Cores** (< 6 cores) - +1 point
2. ✅ **RAM** (≤ 4 GB) - +1 point
3. ✅ **Compute Delay** (> 8ms) - +1 point
4. ✅ **GPU** (Weak GPU) - +1 point
5. ❌ **Battery** - **REMOVE** (temporary state, not capability)

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

## Implementation Priority

1. **Remove battery from LOW score calculation** (High priority)
2. Keep all other metrics as-is (they're working correctly)
3. Battery can remain in display for informational purposes

