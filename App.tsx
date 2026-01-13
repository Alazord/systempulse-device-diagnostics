
import React, { useState, useEffect, useCallback } from 'react';
import { DiagnosticResult, PerformanceLevel } from './types';
import { getDiagnosticData } from './services/deviceService';
import { InfoGrid } from './components/InfoGrid';
import { AnalysisPanel } from './components/AnalysisPanel';

const App: React.FC = () => {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshDiagnostics = useCallback(async () => {
    setLoading(true);
    // Add a tiny artificial delay for visual feedback if it runs too fast
    const [data] = await Promise.all([
      getDiagnosticData(),
      new Promise(res => setTimeout(res, 800))
    ]);
    setResult(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fas fa-bolt text-blue-500 text-2xl animate-pulse"></i>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100">Scanning Hardware</h1>
          <p className="text-slate-500 mt-2">Accessing system kernels and benchmarks...</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const levelColor = {
    [PerformanceLevel.HIGH]: 'emerald',
    [PerformanceLevel.MEDIUM]: 'blue',
    [PerformanceLevel.LOW]: 'rose'
  }[result.performanceLevel];

  const levelIcon = {
    [PerformanceLevel.HIGH]: 'rocket',
    [PerformanceLevel.MEDIUM]: 'bolt',
    [PerformanceLevel.LOW]: 'snail'
  }[result.performanceLevel];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-12 pb-24">
      {/* Header & Main Status */}
      <header className="flex flex-col md:flex-row items-center md:justify-between gap-6">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
            <div className="bg-blue-600/20 p-2 rounded-lg">
              <i className="fas fa-microchip text-blue-400 text-xl"></i>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">SystemPulse</h1>
          </div>
          <p className="text-slate-400 text-sm md:text-base font-medium">Real-time device capability & performance analytics</p>
        </div>

        <button 
          onClick={refreshDiagnostics}
          disabled={loading}
          className="group relative px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl transition-all duration-300 flex items-center gap-3 border border-slate-700 disabled:opacity-50"
        >
          <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}></i>
          <span className="font-bold">Re-run Diagnostics</span>
        </button>
      </header>

      {/* Hero Performance Card */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`col-span-1 lg:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden border-${levelColor}-500/20`}>
          <div className={`absolute top-0 right-0 p-12 -mt-10 -mr-10 bg-${levelColor}-500/10 blur-3xl rounded-full w-64 h-64`}></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <span className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-${levelColor}-500/10 text-${levelColor}-400 mb-6 border border-${levelColor}-500/30`}>
                Diagnostic Status: Complete
              </span>
              <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
                {result.performanceLevel} <span className={`text-${levelColor}-500`}>Performance</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                Based on hardware concurrency, memory buffers, and graphics renderer analysis, your system is classified as <strong className={`text-${levelColor}-400`}>{result.performanceLevel}</strong> grade.
              </p>
            </div>

            <div className="flex flex-wrap gap-8 mt-12 border-t border-slate-700/50 pt-8">
              <div className="flex items-center gap-3">
                <i className={`fas fa-${levelIcon} text-2xl text-${levelColor}-400`}></i>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Profile</p>
                  <p className="font-bold">{result.performanceLevel} TIER</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <i className="fas fa-clock text-2xl text-slate-500"></i>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Last Check</p>
                  <p className="font-bold uppercase">{result.timestamp}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <i className="fas fa-chart-line text-2xl text-slate-500"></i>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Score</p>
                  <p className="font-bold">{4 - result.scoreDetails.totalScore}/4 Quality</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark Visualizer */}
        <div className="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative flex items-center justify-center">
             <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-800"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={552.92}
                  strokeDashoffset={552.92 - (Math.min(result.slowDevice.duration || 0, 500) / 500) * 552.92}
                  className={`text-${levelColor}-500 transition-all duration-1000 ease-out`}
                  strokeLinecap="round"
                />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{result.slowDevice.duration?.toFixed(1) || '0'}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ms delay</span>
             </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">Processing Latency</h3>
            <p className="text-sm text-slate-500">Computational stress-test duration</p>
          </div>
          <div className={`px-4 py-1.5 rounded-lg bg-${result.slowDevice.isSlow ? 'rose' : 'emerald'}-500/10 text-${result.slowDevice.isSlow ? 'rose' : 'emerald'}-400 text-xs font-bold`}>
            {result.slowDevice.isSlow ? 'THROTTLED' : 'STABLE RESPONSE'}
          </div>
        </div>
      </section>

      {/* Detailed Specs Grid */}
      <div className="space-y-12">
        <InfoGrid 
          title="Computation & Memory" 
          items={[
            { label: 'CPU Cores', value: result.capabilities.cpuCores, icon: 'fa-microchip', color: 'blue' },
            { label: 'Device Memory', value: result.capabilities.deviceMemory ? `${result.capabilities.deviceMemory} GB` : 'Unavailable', icon: 'fa-memory', color: 'indigo' },
            { label: 'Platform', value: result.capabilities.platform, icon: 'fa-desktop', color: 'purple' },
            { label: 'Input Points', value: result.capabilities.maxTouchPoints, icon: 'fa-hand-pointer', color: 'pink' },
          ]} 
        />

        <InfoGrid 
          title="Graphics Processor (GPU)" 
          items={[
            { label: 'Renderer', value: result.capabilities.gpu?.renderer || 'Unknown', icon: 'fa-paint-brush', color: 'amber' },
            { label: 'Vendor', value: result.capabilities.gpu?.vendor || 'Unknown', icon: 'fa-building', color: 'orange' },
            { label: 'Max Texture', value: result.capabilities.gpu?.maxTextureSize ? `${result.capabilities.gpu.maxTextureSize}px` : '0px', icon: 'fa-image', color: 'yellow' },
            { label: 'GPU Grade', value: result.hasWeakGPU ? 'Integrated/Weak' : 'Discrete/Strong', icon: 'fa-gauge-high', color: result.hasWeakGPU ? 'rose' : 'emerald' },
          ]} 
        />

        <InfoGrid 
          title="Connectivity & Network" 
          items={[
            { label: 'Online Status', value: result.capabilities.onLine ? 'Connected' : 'Offline', icon: 'fa-wifi', color: result.capabilities.onLine ? 'emerald' : 'rose' },
            { label: 'Protocol', value: result.capabilities.connectionEffectiveType || 'Unknown', icon: 'fa-signal', color: 'cyan' },
            { label: 'Downlink', value: result.capabilities.connectionDownlink ? `${result.capabilities.connectionDownlink} Mbps` : 'N/A', icon: 'fa-download', color: 'sky' },
            { label: 'Latency (RTT)', value: result.capabilities.connectionRtt ? `${result.capabilities.connectionRtt} ms` : 'N/A', icon: 'fa-tachometer-alt', color: 'violet' },
          ]} 
        />
      </div>

      <AnalysisPanel data={result} />

      <footer className="text-center text-slate-600 text-xs space-y-2 pt-12">
        <p>Built with SystemPulse Engine v1.2.0 • Diagnostics based on browser environment capabilities</p>
        <p className="max-w-2xl mx-auto">Privacy Note: All analysis is performed locally. Hardware specifications are used only for calculating performance tiers and generating the report.</p>
      </footer>
    </div>
  );
};

export default App;
