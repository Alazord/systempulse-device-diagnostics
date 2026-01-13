
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
        As a hardware expert, analyze this device data and provide a concise (max 100 words) summary of what this device is suitable for (e.g. casual browsing, high-end gaming, pro video editing).
        
        Performance Level: ${data.performanceLevel}
        CPU Cores: ${data.capabilities.cpuCores}
        Memory: ${data.capabilities.deviceMemory}GB
        GPU: ${data.capabilities.gpu?.renderer || 'Unknown'}
        Benchmark: ${data.slowDevice.duration?.toFixed(2)}ms
        
        Give a verdict and one pro-tip for optimizing this specific setup.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      setAnalysis(response.text || 'Unable to generate analysis.');
    } catch (err) {
      setAnalysis('Connect to the internet or check API settings for AI hardware analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.timestamp]);

  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-indigo-500 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <i className="fas fa-microchip text-indigo-400"></i>
          AI System Verdict
        </h2>
        {loading && <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>}
      </div>
      
      {loading ? (
        <div className="space-y-3">
          <div className="h-4 bg-slate-800 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-slate-800 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-slate-800 rounded w-5/6 animate-pulse"></div>
        </div>
      ) : (
        <p className="text-slate-300 leading-relaxed text-sm md:text-base italic">
          "{analysis}"
        </p>
      )}
    </div>
  );
};
