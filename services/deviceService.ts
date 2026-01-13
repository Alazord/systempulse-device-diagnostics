
import { 
  DiagnosticResult, 
  PerformanceLevel, 
  DeviceCapabilities, 
  GPUInfo, 
  BenchmarkResult, 
  ScoreDetails,
  BatteryInfo,
  StorageInfo
} from '../types';

const CONFIG = {
  lowCPUCoresThreshold: 6,
  highCPUCoresThreshold: 8,
  lowMemoryThreshold: 4,
  highMemoryThreshold: 8,
  minTextureSize: 4096,
  minVertexUniformVectors: 1024,
  slowDeviceThreshold: 8,
  fallbackCores: 2,
};

const WEAK_GPU_PATTERNS = ['intel', 'mali', 'adreno 3', 'adreno 4', 'adreno 5', 'powervr'];
const SOFTWARE_RENDERER_PATTERNS = [
  'microsoft basic render driver',
  'software renderer',
  'llvmpipe',
  'mesa llvmpipe',
  'swiftshader',
  'software rasterizer',
  'chromium software renderer',
  'software rendering',
  'cpu'
];

async function getBatteryInfo(): Promise<BatteryInfo> {
  try {
    const nav = navigator as any;
    if ('getBattery' in nav) {
      const battery = await nav.getBattery();
      return {
        level: battery.level * 100,
        charging: battery.charging,
        supported: true
      };
    }
  } catch {}
  return { level: null, charging: null, supported: false };
}

async function getStorageInfo(): Promise<StorageInfo> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota ? estimate.quota / (1024 * 1024 * 1024) : null, // GB
        usage: estimate.usage ? estimate.usage / (1024 * 1024 * 1024) : null, // GB
        supported: true
      };
    }
  } catch {}
  return { quota: null, usage: null, supported: false };
}

async function estimateRefreshRate(): Promise<number> {
  return new Promise((resolve) => {
    let frameCount = 0;
    let startTime = performance.now();
    
    const checkFrame = () => {
      frameCount++;
      const elapsed = performance.now() - startTime;
      if (elapsed >= 500) {
        resolve(Math.round((frameCount * 1000) / elapsed));
      } else {
        requestAnimationFrame(checkFrame);
      }
    };
    requestAnimationFrame(checkFrame);
  });
}

function detectGPU(): GPUInfo | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    if (!gl) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null;
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null;

    // Check if this is software rendering (no actual GPU)
    if (renderer) {
      const rendererLower = renderer.toLowerCase();
      const isSoftwareRenderer = SOFTWARE_RENDERER_PATTERNS.some(pattern => 
        rendererLower.includes(pattern)
      );
      
      // Also check for suspiciously low texture sizes that indicate software rendering
      const isLikelySoftware = maxTextureSize < 2048 || maxVertexUniformVectors < 256;
      
      if (isSoftwareRenderer || isLikelySoftware) {
        return null; // No actual GPU present
      }
    }

    return {
      maxTextureSize: maxTextureSize || 0,
      maxVertexUniformVectors: maxVertexUniformVectors || 0,
      renderer,
      vendor,
    };
  } catch {
    return null;
  }
}

function getConnectionInfo() {
  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  return {
    type: connection?.type ?? null,
    effectiveType: connection?.effectiveType ?? null,
    downlink: connection?.downlink ?? null,
    rtt: connection?.rtt ?? null,
  };
}

async function runSingleBenchmark(): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const start = performance.now();
      let x = 0;
      // Use a fixed iteration count for consistent benchmarking
      const iterations = 5e6;
      for (let i = 0; i < iterations; i++) {
        x += Math.sqrt(i);
      }
      // Prevent dead code elimination (x is used but compiler might optimize away)
      if (x < 0) console.debug(x);
      const duration = performance.now() - start;
      resolve(duration);
    } catch (error) {
      console.error('Benchmark error:', error);
      resolve(null);
    }
  });
}

async function runCPUStatsBenchmark(): Promise<BenchmarkResult> {
  return new Promise((resolve) => {
    const runMultipleTests = async () => {
      try {
        const rounds = 7; // Run 7 rounds for better accuracy
        const results: number[] = [];
        
        // Run benchmarks sequentially to avoid interference
        for (let i = 0; i < rounds; i++) {
          const duration = await runSingleBenchmark();
          if (duration !== null) {
            results.push(duration);
          }
          // Small delay between rounds to let CPU cool down slightly
          if (i < rounds - 1) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        if (results.length === 0) {
          resolve({ isSlow: false, duration: null });
          return;
        }
        
        // Sort and take median (more stable than mean)
        results.sort((a, b) => a - b);
        const medianIndex = Math.floor(results.length / 2);
        const medianDuration = results.length % 2 === 0
          ? (results[medianIndex - 1] + results[medianIndex]) / 2
          : results[medianIndex];
        
        // Calculate variance to check consistency
        const mean = results.reduce((a, b) => a + b, 0) / results.length;
        const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / results.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean;
        
        // Use trimmed mean (remove outliers) for more stable results
        // Remove top and bottom 20% of results, then take mean of middle 60%
        const trimCount = Math.floor(results.length * 0.2);
        const trimmedResults = results.slice(trimCount, results.length - trimCount);
        const trimmedMean = trimmedResults.reduce((a, b) => a + b, 0) / trimmedResults.length;
        
        // Use the more stable value: prefer trimmed mean if variance is high, otherwise use median
        const stableDuration = coefficientOfVariation > 0.15 ? trimmedMean : medianDuration;
        
        // If variance is high (>20%), use a more lenient threshold to avoid false positives
        // Otherwise use the standard threshold
        const adjustedThreshold = coefficientOfVariation > 0.2 
          ? CONFIG.slowDeviceThreshold * 1.5  // 50% more lenient if high variance
          : CONFIG.slowDeviceThreshold;
        
        const isSlow = stableDuration > adjustedThreshold;
        resolve({ isSlow, duration: stableDuration });
      } catch {
        resolve({ isSlow: false, duration: null });
      }
    };

    if (typeof (window as any).requestIdleCallback !== 'undefined') {
      (window as any).requestIdleCallback(runMultipleTests, { timeout: 5000 });
    } else {
      setTimeout(runMultipleTests, 50);
    }
  });
}

function checkIsWeakGPU(gpu: GPUInfo | null): boolean {
  if (!gpu) return true;
  const isLowTextureSize = gpu.maxTextureSize < CONFIG.minTextureSize;
  const isLowVertexUniforms = gpu.maxVertexUniformVectors < CONFIG.minVertexUniformVectors;
  const renderer = gpu.renderer?.toLowerCase() ?? '';
  const isKnownWeakGPU = WEAK_GPU_PATTERNS.some(pattern => renderer.includes(pattern));
  return isLowTextureSize || isLowVertexUniforms || isKnownWeakGPU;
}

export const getDiagnosticData = async (): Promise<DiagnosticResult> => {
  const [gpu, conn, battery, storage, refreshRate, slowDeviceResult] = await Promise.all([
    detectGPU(),
    getConnectionInfo(),
    getBatteryInfo(),
    getStorageInfo(),
    estimateRefreshRate(),
    runCPUStatsBenchmark()
  ]);
  
  const rawMemory = (navigator as any).deviceMemory || null;
  // Browser standard: memory is capped at 8GB to prevent fingerprinting
  const isMemoryCapped = rawMemory === 8;

  // Detect if this is an Apple Silicon Mac (M1, M2, M3, etc.)
  // Apple Silicon doesn't use hyperthreading, so hardwareConcurrency = physical cores
  function isAppleSilicon(): boolean {
    const platform = navigator.platform?.toLowerCase() || '';
    const userAgent = navigator.userAgent?.toLowerCase() || '';
    const vendor = navigator.vendor?.toLowerCase() || '';
    
    // Check for Mac platform
    const isMac = platform.includes('mac') || userAgent.includes('mac os');
    
    // Check for Apple vendor
    const isApple = vendor.includes('apple') || userAgent.includes('apple');
    
    // Check for ARM architecture (Apple Silicon uses ARM)
    const isARM = userAgent.includes('arm') || 
                  userAgent.includes('aarch64') ||
                  userAgent.includes('apple m') ||
                  userAgent.includes('apple silicon');
    
    // Explicit Intel detection - Intel Macs will have these indicators
    const isIntelMac = userAgent.includes('intel') || 
                       userAgent.includes('x86_64') || 
                       userAgent.includes('x86-64') ||
                       userAgent.includes('intel mac');
    
    // Apple Silicon detection:
    // 1. Mac + Apple vendor + ARM architecture = definitely Apple Silicon
    // 2. Mac + Apple vendor + no Intel indicators = likely Apple Silicon (modern Macs)
    //    Intel Macs were discontinued in 2020, so Macs without Intel indicators are Apple Silicon
    if (isMac && isApple) {
      if (isARM) {
        return true; // Definitely Apple Silicon if ARM
      }
      if (isIntelMac) {
        return false; // Definitely Intel Mac
      }
      // Modern Macs (2020+) without Intel indicators are Apple Silicon
      // This catches cases where userAgent might not explicitly mention ARM
      return true;
    }
    
    return false;
  }

  // Estimate physical CPU cores from logical cores
  // Apple Silicon: hardwareConcurrency = total cores (performance + efficiency cores, no hyperthreading)
  // x86 CPUs: Many use hyperthreading/SMT (logical = 2x physical), but not all
  function estimatePhysicalCores(logicalCores: number): number {
    // Apple Silicon Macs: hardwareConcurrency reports total cores (P-cores + E-cores)
    // M1: 8 cores, M1 Pro: 10 cores, M1 Max: 10 cores
    // M2: 8 cores, M2 Pro: 12 cores, M2 Max: 12 cores  
    // M3: 8 cores, M3 Pro: 12 cores, M3 Max: 16 cores (12P + 4E)
    // These are physical cores, not logical, so return as-is
    if (isAppleSilicon()) {
      return logicalCores;
    }
    
    // For very low core counts, assume no hyperthreading
    if (logicalCores <= 2) {
      return logicalCores;
    }
    
    // Odd numbers are almost always physical cores (hyperthreading doubles cores)
    if (logicalCores % 2 === 1) {
      return logicalCores;
    }
    
    // For even numbers, be conservative
    // Many modern CPUs (especially mobile/embedded) don't use hyperthreading
    // Only assume hyperthreading for very common desktop CPU patterns
    
    // Common hyperthreading patterns in desktop CPUs:
    // - 4 logical cores: Often 2 physical (Intel Core i3, some i5) OR 4 physical (many modern CPUs)
    // - 8 logical cores: Often 4 physical (Intel Core i7) OR 8 physical (AMD Ryzen, newer CPUs)
    // - 12 logical cores: Often 6 physical (Intel Core i7/i9) OR 12 physical (AMD Ryzen)
    // - 16 logical cores: Often 8 physical (Intel Core i9) OR 16 physical (AMD Ryzen)
    
    // Conservative approach: Only assume HT for high core counts that are clearly HT patterns
    // Most consumer CPUs with HT have 8, 12, 16, 20, 24+ logical cores
    // But many modern CPUs (especially AMD Ryzen, Apple Silicon, mobile) don't use HT
    
    // Be very conservative: only divide by 2 for very high counts (>= 16) that are clearly HT
    // For lower counts, show logical cores to avoid underestimating
    if (logicalCores >= 16 && logicalCores % 4 === 0) {
      // High-end desktop CPUs with HT: 16, 20, 24, 28, 32 logical cores
      // These are likely hyperthreaded (e.g., 16 logical = 8 physical)
      return Math.floor(logicalCores / 2);
    }
    
    // For most other cases (4, 6, 8, 10, 12, 14 cores), be conservative
    // Many modern CPUs have these as physical cores without hyperthreading
    // It's better to show the actual logical cores than to underestimate
    return logicalCores;
  }

  const logicalCores = navigator.hardwareConcurrency || CONFIG.fallbackCores;
  
  // Special case: M3 Max has 16 cores - if we detect Mac with 16 cores, it's definitely Apple Silicon
  // This is a fallback in case the user agent detection fails
  const platform = navigator.platform?.toLowerCase() || '';
  const userAgent = navigator.userAgent?.toLowerCase() || '';
  const vendor = navigator.vendor?.toLowerCase() || '';
  const isMac = platform.includes('mac') || userAgent.includes('mac os');
  const isApple = vendor.includes('apple') || userAgent.includes('apple');
  
  // Calculate physical cores
  let physicalCores: number;
  
  // Special handling for Macs: Check if it's Apple Silicon first
  const isAppleSiliconMac = isMac && isApple;
  
  if (isAppleSiliconMac) {
    // For Macs, check specific core counts that indicate Apple Silicon models
    // M3 Max: 16 cores, M3 Pro: 12 cores, M2 Max: 12 cores, M2 Pro: 12 cores
    // M1 Max: 10 cores, M1 Pro: 10 cores, M1/M2/M3 base: 8 cores
    // These are all Apple Silicon and should not be divided
    if (logicalCores === 16 || logicalCores === 12 || logicalCores === 10 || logicalCores === 8) {
      // These are known Apple Silicon core counts - return as-is
      physicalCores = logicalCores;
    } else {
      // Use detection function for other cases
      physicalCores = estimatePhysicalCores(logicalCores);
    }
  } else {
    // Non-Mac systems: use standard detection
    physicalCores = estimatePhysicalCores(logicalCores);
  }

  const capabilities: DeviceCapabilities = {
    cpuCores: physicalCores,
    deviceMemory: rawMemory,
    isMemoryCapped,
    gpu,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    vendor: navigator.vendor,
    onLine: navigator.onLine,
    connectionType: conn.type,
    connectionEffectiveType: conn.effectiveType,
    connectionDownlink: conn.downlink,
    connectionRtt: conn.rtt,
    battery,
    storage,
    refreshRate
  };

  const hasWeakGPU = checkIsWeakGPU(gpu);

  let score = 0;
  const scoreDetails: ScoreDetails = {
    lowCPUCores: false,
    lowMemory: false,
    weakGPU: false,
    slowDevice: false,
    throttledState: false,
    totalScore: 0,
  };

  if (capabilities.cpuCores < CONFIG.lowCPUCoresThreshold) {
    score++;
    scoreDetails.lowCPUCores = true;
  }

  const memory = capabilities.deviceMemory || 2;
  if (memory <= CONFIG.lowMemoryThreshold) {
    score++;
    scoreDetails.lowMemory = true;
  }

  if (hasWeakGPU) {
    score++;
    scoreDetails.weakGPU = true;
  }

  if (slowDeviceResult.isSlow) {
    score++;
    scoreDetails.slowDevice = true;
  }

  if (battery.supported && (battery.level || 0) < 20 && !battery.charging) {
    score++;
    scoreDetails.throttledState = true;
  }
  
  scoreDetails.totalScore = score;

  let performanceLevel: PerformanceLevel;
  if (score >= 2) {
    performanceLevel = PerformanceLevel.LOW;
  } else if (
    capabilities.cpuCores >= CONFIG.highCPUCoresThreshold &&
    (capabilities.deviceMemory !== null && capabilities.deviceMemory >= CONFIG.highMemoryThreshold) &&
    !hasWeakGPU &&
    (refreshRate || 0) >= 90
  ) {
    performanceLevel = PerformanceLevel.HIGH;
  } else {
    performanceLevel = PerformanceLevel.MEDIUM;
  }

  return {
    performanceLevel,
    capabilities,
    hasWeakGPU,
    slowDevice: slowDeviceResult,
    scoreDetails,
    timestamp: new Date().toLocaleTimeString(),
  };
};
