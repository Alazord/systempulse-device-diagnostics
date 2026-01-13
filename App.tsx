
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
    const data = await getDiagnosticData();
    setResult(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshDiagnostics();
  }, [refreshDiagnostics]);

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
          <h1 className="text-2xl font-bold text-slate-100">Analyzing Architecture</h1>
          <p className="text-slate-500 mt-2">Checking cores, power states, and frames...</p>
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

  const storageUsagePercent = result.capabilities.storage.quota && result.capabilities.storage.usage 
    ? (result.capabilities.storage.usage / result.capabilities.storage.quota) * 100 
    : 0;

  // Format RAM string
  const ramDisplay = result.capabilities.deviceMemory 
    ? (result.capabilities.isMemoryCapped ? `8+ GB (Capped)` : `${result.capabilities.deviceMemory} GB`)
    : 'N/A';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-12 pb-24">
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
          <span className="font-bold">Refresh Health</span>
        </button>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`col-span-1 lg:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden border-${levelColor}-500/20`}>
          <div className={`absolute top-0 right-0 p-12 -mt-10 -mr-10 bg-${levelColor}-500/10 blur-3xl rounded-full w-64 h-64`}></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-${levelColor}-500/10 text-${levelColor}-400 border border-${levelColor}-500/30`}>
                  Live Analysis
                </span>
                {result.capabilities.battery.supported && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-2`}>
                    <i className={`fas fa-battery-${Math.floor((result.capabilities.battery.level || 0) / 25) || 'empty'}`}></i>
                    {Math.round(result.capabilities.battery.level || 0)}% {result.capabilities.battery.charging ? '(Charging)' : ''}
                  </span>
                )}
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
                {result.performanceLevel} <span className={`text-${levelColor}-500`}>Grade</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                Your system is currently rated as <strong className={`text-${levelColor}-400`}>{result.performanceLevel}</strong>. 
                {result.capabilities.isMemoryCapped && " RAM reporting is capped at 8GB by your browser for privacy."}
              </p>
            </div>

            <div className="flex flex-wrap gap-8 mt-12 border-t border-slate-700/50 pt-8">
              <div className="flex items-center gap-3">
                <i className={`fas fa-${levelIcon} text-2xl text-${levelColor}-400`}></i>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Tier</p>
                  <p className="font-bold uppercase">{result.performanceLevel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <i className="fas fa-tv text-2xl text-indigo-400"></i>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Display</p>
                  <p className="font-bold">{result.capabilities.refreshRate || '--'} Hz</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <i className="fas fa-memory text-2xl text-purple-400"></i>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Memory</p>
                  <p className="font-bold">{ramDisplay}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
               <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs">Storage Volume</h3>
               <span className="text-xs text-slate-500 font-mono">
                {result.capabilities.storage.usage?.toFixed(1)} / {result.capabilities.storage.quota?.toFixed(0)} GB
               </span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
               <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                style={{ width: `${Math.max(storageUsagePercent, 2)}%` }}
               ></div>
            </div>
            <p className="text-xs text-slate-500 italic">Available space for cached assets and local databases.</p>
          </div>

          <div className="pt-6 border-t border-slate-800">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compute Delay</h3>
               <span className={`text-xs font-bold text-${result.slowDevice.isSlow ? 'rose' : 'emerald'}-400`}>
                {result.slowDevice.isSlow ? 'High' : 'Low'}
               </span>
             </div>
             <div className="flex items-center gap-4">
               <span className="text-3xl font-black text-white">{result.slowDevice.duration?.toFixed(1)}<span className="text-sm font-normal text-slate-500 ml-1">ms</span></span>
               <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                 <div 
                  className={`h-full bg-${result.slowDevice.isSlow ? 'rose' : 'emerald'}-500 transition-all duration-700`}
                  style={{ width: `${Math.min((result.slowDevice.duration || 0) / 2, 100)}%` }}
                 ></div>
               </div>
             </div>
          </div>
        </div>
      </section>

      <div className="space-y-12">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
            Compute & Memory 
            {result.capabilities.isMemoryCapped && (
              <span className="text-[10px] normal-case bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-normal tracking-normal">
                Browser Cap Active
              </span>
            )}
          </h3>
          <InfoGrid 
            title="" 
            items={[
              { label: 'Cores', value: result.capabilities.cpuCores, icon: 'fa-microchip', color: 'blue' },
              { label: 'RAM Buffer', value: ramDisplay, icon: 'fa-memory', color: 'indigo' },
              { label: 'Refresh Rate', value: `${result.capabilities.refreshRate} Hz`, icon: 'fa-bolt', color: 'yellow' },
              { label: 'Platform', value: result.capabilities.platform, icon: 'fa-laptop', color: 'purple' },
            ]} 
          />
        </div>

        <InfoGrid 
          title="Graphics Engine" 
          items={[
            { label: 'Renderer', value: result.capabilities.gpu?.renderer || 'No GPU Detected', icon: 'fa-paint-brush', color: result.capabilities.gpu ? 'amber' : 'rose' },
            { label: 'Vendor', value: result.capabilities.gpu?.vendor || 'N/A', icon: 'fa-industry', color: result.capabilities.gpu ? 'orange' : 'rose' },
            { label: 'Texture Limit', value: result.capabilities.gpu ? `${result.capabilities.gpu.maxTextureSize}px` : 'N/A', icon: 'fa-vector-square', color: result.capabilities.gpu ? 'cyan' : 'rose' },
            { label: 'GPU Health', value: !result.capabilities.gpu ? 'No GPU' : (result.hasWeakGPU ? 'Integrated' : 'Discrete Performance'), icon: 'fa-gauge-high', color: !result.capabilities.gpu ? 'rose' : (result.hasWeakGPU ? 'rose' : 'emerald') },
          ]} 
        />

        <InfoGrid 
          title="Network & Power" 
          items={[
            { label: 'Connection', value: result.capabilities.connectionEffectiveType?.toUpperCase() || 'Offline', icon: 'fa-wifi', color: result.capabilities.onLine ? 'emerald' : 'rose' },
            { label: 'Downlink', value: result.capabilities.connectionDownlink ? `${result.capabilities.connectionDownlink} Mbps` : 'N/A', icon: 'fa-download', color: 'sky' },
            { label: 'Battery Level', value: result.capabilities.battery.supported ? `${Math.round(result.capabilities.battery.level || 0)}%` : 'Blocked', icon: 'fa-battery-full', color: 'lime' },
            { label: 'Charging', value: result.capabilities.battery.charging ? 'Active' : 'Battery', icon: 'fa-plug', color: 'amber' },
          ]} 
        />
      </div>

      <AnalysisPanel data={result} />

      <footer className="text-center text-slate-600 text-[10px] space-y-2 pt-12 uppercase tracking-widest font-bold">
        <p>Engine Build 2.1.0 • Privacy Compliant Diagnostics</p>
        <p className="max-w-xl mx-auto opacity-50">Memory reporting is capped at 8GB by most browsers for anti-fingerprinting. Your actual hardware likely has more RAM than what the browser exposes.</p>
      </footer>
    </div>
  );
};

export default App;
