
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
      for (let i = 0; i < 5e6; i++) {
        x += Math.sqrt(i);
      }
      if (x < 0) console.debug(x);
      const duration = performance.now() - start;
      resolve(duration);
    } catch {
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
        
        // Sort and take median
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
        
        // If variance is high (>20%), use a more lenient threshold to avoid false positives
        // Otherwise use the standard threshold
        const adjustedThreshold = coefficientOfVariation > 0.2 
          ? CONFIG.slowDeviceThreshold * 1.5  // 50% more lenient if high variance
          : CONFIG.slowDeviceThreshold;
        
        const isSlow = medianDuration > adjustedThreshold;
        resolve({ isSlow, duration: medianDuration });
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
    const isARM = userAgent.includes('arm') || userAgent.includes('aarch64');
    
    // Apple Silicon Macs: Mac platform + Apple vendor + typically ARM
    // Note: Some Intel Macs might match Mac + Apple, but they would have x86_64 in userAgent
    const isIntelMac = userAgent.includes('intel') || userAgent.includes('x86_64');
    
    return isMac && isApple && !isIntelMac;
  }

  // Estimate physical CPU cores from logical cores
  // Apple Silicon: hardwareConcurrency already = physical cores (no hyperthreading)
  // x86 CPUs: Most use hyperthreading/SMT (logical = 2x physical)
  function estimatePhysicalCores(logicalCores: number): number {
    // Apple Silicon Macs: hardwareConcurrency is already physical cores
    if (isAppleSilicon()) {
      return logicalCores;
    }
    
    // For other systems, estimate physical cores
    if (logicalCores <= 2) {
      return logicalCores; // Likely no hyperthreading on very low core counts
    }
    
    // Check for odd numbers which might indicate no hyperthreading
    if (logicalCores % 2 === 1) {
      // Odd number might be actual physical cores (e.g., 3, 5, 7)
      return logicalCores;
    }
    
    // Even numbers: likely hyperthreading, so divide by 2
    return Math.floor(logicalCores / 2);
  }

  const logicalCores = navigator.hardwareConcurrency || CONFIG.fallbackCores;
  const physicalCores = estimatePhysicalCores(logicalCores);

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
  if (memory < CONFIG.lowMemoryThreshold) {
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
