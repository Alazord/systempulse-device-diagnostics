
export enum PerformanceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface GPUInfo {
  maxTextureSize: number;
  maxVertexUniformVectors: number;
  renderer: string | null;
  vendor: string | null;
}

export interface ConnectionInfo {
  type: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

export interface DeviceCapabilities {
  cpuCores: number;
  deviceMemory: number | null;
  gpu: GPUInfo | null;
  platform: string | null;
  userAgent: string;
  maxTouchPoints: number;
  vendor: string | null;
  onLine: boolean;
  connectionType: string | null;
  connectionEffectiveType: string | null;
  connectionDownlink: number | null;
  connectionRtt: number | null;
}

export interface BenchmarkResult {
  isSlow: boolean;
  duration: number | null;
}

export interface ScoreDetails {
  lowCPUCores: boolean;
  lowMemory: boolean;
  weakGPU: boolean;
  slowDevice: boolean;
  totalScore: number;
}

export interface DiagnosticResult {
  performanceLevel: PerformanceLevel;
  capabilities: DeviceCapabilities;
  hasWeakGPU: boolean;
  slowDevice: BenchmarkResult;
  scoreDetails: ScoreDetails;
  timestamp: string;
}
