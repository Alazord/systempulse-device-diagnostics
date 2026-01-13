
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

export interface BatteryInfo {
  level: number | null;
  charging: boolean | null;
  supported: boolean;
}

export interface StorageInfo {
  quota: number | null;
  usage: number | null;
  supported: boolean;
}

export interface DeviceCapabilities {
  cpuCores: number;
  deviceMemory: number | null;
  isMemoryCapped: boolean;
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
  battery: BatteryInfo;
  storage: StorageInfo;
  refreshRate: number | null;
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
  throttledState: boolean;
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
