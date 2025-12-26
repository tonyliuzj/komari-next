"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import CircleChart from "./CircleChart";
import { Progress } from "@/components/ui/progress";

interface AdaptiveChartProps {
  value: number; // 0-100
  label: string;
  subLabel?: string;
  color?: string;
  compact?: boolean; // Compact mode for table views
}

export default function AdaptiveChart({ value, label, subLabel, color, compact = false }: AdaptiveChartProps) {
  const { themeConfig } = useTheme();
  const chartValue = Math.min(Math.max(value, 0), 100);

  // Get theme colors - must use full class names for Tailwind JIT
  const getColorClass = (val: number) => {
    const isHigh = val >= 80;
    const isMid = val >= 60;

    switch (themeConfig.colorTheme) {
      case 'ocean':
        return isHigh ? 'text-blue-600' : isMid ? 'text-cyan-600' : 'text-cyan-500';
      case 'sunset':
        return isHigh ? 'text-pink-500' : isMid ? 'text-orange-500' : 'text-orange-400';
      case 'forest':
        return isHigh ? 'text-emerald-600' : isMid ? 'text-green-500' : 'text-green-400';
      case 'midnight':
        return isHigh ? 'text-purple-700' : isMid ? 'text-indigo-600' : 'text-indigo-500';
      case 'rose':
        return isHigh ? 'text-rose-600' : isMid ? 'text-pink-500' : 'text-pink-400';
      default:
        return isHigh ? 'text-purple-600' : isMid ? 'text-blue-500' : 'text-blue-400';
    }
  };

  const getBarColorClass = (val: number) => {
    const isHigh = val >= 80;
    const isMid = val >= 60;

    switch (themeConfig.colorTheme) {
      case 'ocean':
        return isHigh ? 'bg-blue-600' : isMid ? 'bg-cyan-600' : 'bg-cyan-500';
      case 'sunset':
        return isHigh ? 'bg-pink-500' : isMid ? 'bg-orange-500' : 'bg-orange-400';
      case 'forest':
        return isHigh ? 'bg-emerald-600' : isMid ? 'bg-green-500' : 'bg-green-400';
      case 'midnight':
        return isHigh ? 'bg-purple-700' : isMid ? 'bg-indigo-600' : 'bg-indigo-500';
      case 'rose':
        return isHigh ? 'bg-rose-600' : isMid ? 'bg-pink-500' : 'bg-pink-400';
      default:
        return isHigh ? 'bg-purple-600' : isMid ? 'bg-blue-500' : 'bg-blue-400';
    }
  };

  // Minimal Design
  if (themeConfig.graphDesign === 'minimal') {
    if (compact) {
      return (
        <div className="flex items-center justify-center">
          <div className={`text-sm font-bold ${getColorClass(chartValue)}`}>
            {Math.round(chartValue)}%
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-2 min-w-[90px]">
        <div className={`text-2xl font-bold ${getColorClass(chartValue)}`}>
          {Math.round(chartValue)}%
        </div>
        <div className="text-center mt-1">
          <div className="text-xs font-semibold text-foreground/90">{label}</div>
          {subLabel && (
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">{subLabel}</div>
          )}
        </div>
      </div>
    );
  }

  // Progress Bar Design
  if (themeConfig.graphDesign === 'progress') {
    if (compact) {
      return (
        <div className="flex items-center justify-center">
          <div className="w-[50px] space-y-1">
            <Progress value={chartValue} className="h-1.5" />
            <div className={`text-[10px] font-bold text-center ${getColorClass(chartValue)}`}>
              {Math.round(chartValue)}%
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-2 min-w-[90px] space-y-2">
        <div className="text-center">
          <div className="text-xs font-semibold text-foreground/90">{label}</div>
          {subLabel && (
            <div className="text-[10px] text-muted-foreground/60">{subLabel}</div>
          )}
        </div>
        <div className="w-full max-w-[80px] space-y-1">
          <Progress value={chartValue} className="h-2" />
          <div className={`text-sm font-bold text-center ${getColorClass(chartValue)}`}>
            {Math.round(chartValue)}%
          </div>
        </div>
      </div>
    );
  }

  // Bar Chart Design
  if (themeConfig.graphDesign === 'bar') {
    if (compact) {
      return (
        <div className="flex items-center justify-center">
          <div className="h-[40px] w-[30px] flex flex-col justify-end items-center">
            <div className="w-full flex flex-col justify-end items-center h-full relative">
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${getBarColorClass(chartValue)}`}
                style={{ height: `${chartValue}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-[9px] font-bold drop-shadow-lg ${
                  chartValue >= 30 ? 'text-white' : 'text-foreground'
                }`}>
                  {Math.round(chartValue)}%
                </span>
              </div>
            </div>
            <div className="w-full h-0.5 bg-border mt-0.5" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-2 min-w-[90px]">
        <div className="h-[90px] w-[60px] flex flex-col justify-end items-center">
          <div className="w-full flex flex-col justify-end items-center h-full relative">
            <div
              className={`w-full rounded-t-lg transition-all duration-500 ${getBarColorClass(chartValue)}`}
              style={{ height: `${chartValue}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-bold drop-shadow-lg ${
                chartValue >= 80 ? 'text-white' :
                chartValue >= 60 ? 'text-white' :
                chartValue >= 30 ? 'text-white' :
                'text-foreground'
              }`}>
                {Math.round(chartValue)}%
              </span>
            </div>
          </div>
          <div className="w-full h-0.5 bg-border mt-1" />
        </div>
        <div className="text-center mt-2">
          <div className="text-xs font-semibold text-foreground/90">{label}</div>
          {subLabel && (
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">{subLabel}</div>
          )}
        </div>
      </div>
    );
  }

  // Default: Circle Design
  return <CircleChart value={value} label={label} subLabel={subLabel} color={color} compact={compact} />;
}
