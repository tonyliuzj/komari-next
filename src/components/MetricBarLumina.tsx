import React from 'react';

interface MetricBarProps {
  label: string;
  value: number;
  unit?: string;
  color?: string;
}

export const MetricBarLumina = ({ label, value, unit = '%', color = 'bg-blue-500' }: MetricBarProps) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] uppercase tracking-wider opacity-60 font-medium">
      <span>{label}</span>
      <span>{value.toFixed(1)}{unit}</span>
    </div>
    <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  </div>
);