
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
  slowDeviceThreshold: 80,
  fallbackCores: 2,
};

const WEAK_GPU_PATTERNS = ['intel', 'mali', 'adreno 3', 'adreno 4', 'adreno 5', 'powervr'];

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

async function runCPUStatsBenchmark(): Promise<BenchmarkResult> {
  return new Promise((resolve) => {
    const runTest = () => {
      try {
        const start = performance.now();
        let x = 0;
        for (let i = 0; i < 5e6; i++) {
          x += Math.sqrt(i);
        }
        if (x < 0) console.debug(x);

        const duration = performance.now() - start;
        const isSlow = duration > CONFIG.slowDeviceThreshold;
        resolve({ isSlow, duration });
      } catch {
        resolve({ isSlow: false, duration: null });
      }
    };

    if (typeof (window as any).requestIdleCallback !== 'undefined') {
      (window as any).requestIdleCallback(runTest, { timeout: 2000 });
    } else {
      setTimeout(runTest, 50);
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

  const capabilities: DeviceCapabilities = {
    cpuCores: navigator.hardwareConcurrency || CONFIG.fallbackCores,
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
