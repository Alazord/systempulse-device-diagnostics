
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { DiagnosticResult } from '../types';

interface AnalysisPanelProps {
  data: DiagnosticResult;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ data }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchAIAnalysis = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        As a hardware expert, analyze this device's browser-exposed diagnostic data:
        
        - Performance Tier: ${data.performanceLevel}
        - CPU/Memory: ${data.capabilities.cpuCores} cores, ${data.capabilities.deviceMemory}GB RAM
        - RAM Note: ${data.capabilities.isMemoryCapped ? 'This 8GB value is a browser reporting cap; actual RAM is likely much higher (16GB, 32GB, or 64GB).' : 'Reported value is likely accurate.'}
        - Display: ${data.capabilities.refreshRate}Hz
        - Graphics: ${data.capabilities.gpu?.renderer || 'Unknown'}
        - Power: ${data.capabilities.battery.level}% (Charging: ${data.capabilities.battery.charging})
        - Stress Benchmark: ${data.slowDevice.duration?.toFixed(2)}ms
        
        Provide a concise, expert breakdown (max 80 words). If memory is capped at 8GB, briefly explain why the browser limits this stat. 
        Add one actionable "pro-tip" to improve its longevity or performance.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      setAnalysis(response.text || 'Unable to generate analysis.');
    } catch (err) {
      setAnalysis('Connect to the internet to allow the Gemini Engine to analyze these hardware specs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.timestamp]);

  return (
    <div className="glass-card p-8 rounded-3xl border-l-4 border-indigo-500 mt-8 relative overflow-hidden group shadow-2xl">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <i className="fas fa-brain text-8xl"></i>
      </div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h2 className="text-xl font-black flex items-center gap-3 text-white uppercase tracking-tighter">
          <span className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <i className="fas fa-sparkles text-indigo-400 text-xs"></i>
          </span>
          AI System Verdict
        </h2>
        {loading && <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>}
      </div>
      
      <div className="relative z-10">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-slate-800 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-slate-800 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-slate-800 rounded w-5/6 animate-pulse"></div>
          </div>
        ) : (
          <p className="text-slate-200 leading-relaxed text-base font-medium">
            {analysis}
          </p>
        )}
      </div>
    </div>
  );
};
