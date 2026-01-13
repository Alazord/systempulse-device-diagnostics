
import React from 'react';

interface InfoItemProps {
  label: string;
  value: string | number | boolean | null;
  icon: string;
  color?: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, icon, color = 'blue' }) => (
  <div className="glass-card p-4 rounded-xl flex items-center space-x-4 border border-slate-700/50 hover:border-slate-500/50 transition-all duration-300">
    <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 flex items-center justify-center text-${color}-400`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div>
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-slate-100">{value?.toString() ?? 'N/A'}</p>
    </div>
  </div>
);

interface InfoGridProps {
  title: string;
  items: InfoItemProps[];
}

export const InfoGrid: React.FC<InfoGridProps> = ({ title, items }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] px-1">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <InfoItem key={idx} {...item} />
      ))}
    </div>
  </div>
);
