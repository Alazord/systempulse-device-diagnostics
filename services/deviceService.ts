
import { 
  DiagnosticResult, 
  PerformanceLevel, 
  DeviceCapabilities, 
  GPUInfo, 
  BenchmarkResult, 
  ScoreDetails 
} from '../types';

const CONFIG = {
  lowCPUCoresThreshold: 6,
  highCPUCoresThreshold: 8,
  lowMemoryThreshold: 4,
  highMemoryThreshold: 8,
  minTextureSize: 4096,
  minVertexUniformVectors: 1024,
  slowDeviceThreshold: 100,
  fallbackCores: 2,
};

const WEAK_GPU_PATTERNS = ['intel', 'mali', 'adreno 3', 'adreno 4', 'adreno 5', 'powervr'];

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
        for (let i = 0; i < 1e6; i++) {
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
  const gpu = detectGPU();
  const conn = getConnectionInfo();
  
  const capabilities: DeviceCapabilities = {
    cpuCores: navigator.hardwareConcurrency || CONFIG.fallbackCores,
    deviceMemory: (navigator as any).deviceMemory || null,
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
  };

  const hasWeakGPU = checkIsWeakGPU(gpu);
  const slowDeviceResult = await runCPUStatsBenchmark();

  let score = 0;
  const scoreDetails: ScoreDetails = {
    lowCPUCores: false,
    lowMemory: false,
    weakGPU: false,
    slowDevice: false,
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
  scoreDetails.totalScore = score;

  let performanceLevel: PerformanceLevel;
  if (score >= 2) {
    performanceLevel = PerformanceLevel.LOW;
  } else if (
    capabilities.cpuCores > CONFIG.highCPUCoresThreshold &&
    capabilities.deviceMemory !== null &&
    capabilities.deviceMemory >= CONFIG.highMemoryThreshold &&
    !hasWeakGPU
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
