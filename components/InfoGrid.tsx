
import React from 'react';

interface InfoItemProps {
  label: string;
  value: string | number | boolean | null;
  icon: string;
  color?: string;
}

const colorClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  sky: { bg: 'bg-sky-500/20', text: 'text-sky-400' },
  lime: { bg: 'bg-lime-500/20', text: 'text-lime-400' },
};

const InfoItem: React.FC<InfoItemProps> = ({ label, value, icon, color = 'blue' }) => {
  const colorClass = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className="glass-card p-4 rounded-xl flex items-center space-x-4 border border-slate-700/50 hover:border-slate-500/50 transition-all duration-300">
      <div className={`w-10 h-10 rounded-lg ${colorClass.bg} flex items-center justify-center ${colorClass.text}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-lg font-semibold text-slate-100">{value?.toString() ?? 'N/A'}</p>
      </div>
    </div>
  );
};

interface InfoGridProps {
  title: string;
  items: InfoItemProps[];
}

export const InfoGrid: React.FC<InfoGridProps> = ({ title, items }) => (
  <div className="space-y-4">
    {title && (
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] px-1">{title}</h3>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <InfoItem key={`${item.label}-${idx}`} {...item} />
      ))}
    </div>
  </div>
);
