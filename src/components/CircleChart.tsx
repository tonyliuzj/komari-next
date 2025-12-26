"use client";

import React from "react";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

interface CircleChartProps {
  value: number; // 0-100
  label: string;
  subLabel?: string;
  color?: string; // Optional override
  compact?: boolean; // Compact mode for table views
}

export default function CircleChart({ value, label, subLabel, color, compact = false }: CircleChartProps) {
  const { themeConfig } = useTheme();

  // Clamp value
  const chartValue = Math.min(Math.max(value, 0), 100);

  // Get theme color based on selected color theme and value
  const getThemeColor = () => {
    if (color) return color; // Use override if provided

    const getColorForTheme = () => {
      switch (themeConfig.colorTheme) {
        case 'ocean':
          return chartValue >= 80 ? '#0284c7' : chartValue >= 60 ? '#06b6d4' : '#22d3ee';
        case 'sunset':
          return chartValue >= 80 ? '#ec4899' : chartValue >= 60 ? '#f97316' : '#fb923c';
        case 'forest':
          return chartValue >= 80 ? '#059669' : chartValue >= 60 ? '#10b981' : '#4ade80';
        case 'midnight':
          return chartValue >= 80 ? '#7c3aed' : chartValue >= 60 ? '#6366f1' : '#818cf8';
        case 'rose':
          return chartValue >= 80 ? '#e11d48' : chartValue >= 60 ? '#ec4899' : '#f472b6';
        default: // 'default'
          return chartValue >= 80 ? '#9333ea' : chartValue >= 60 ? '#3b82f6' : '#60a5fa';
      }
    };

    return getColorForTheme();
  };

  const fillColor = getThemeColor();

  const data = [
    {
      name: label,
      value: chartValue,
      fill: fillColor,
    },
  ];

  // Compact mode for table views
  if (compact) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-[80px] w-[80px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="95%"
              barSize={7}
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: 'rgba(128, 128, 128, 0.1)' }}
                dataKey="value"
                cornerRadius={10}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Centered Percentage for compact mode */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] font-bold text-foreground">
              {Math.round(chartValue)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default mode with labels
  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="h-[90px] w-[90px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="95%"
            barSize={8}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: 'rgba(128, 128, 128, 0.1)' }}
              dataKey="value"
              cornerRadius={10}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Centered Percentage */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-base font-bold text-foreground drop-shadow-sm tracking-tight">
            {Math.round(chartValue)}%
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="text-center mt-2">
        <div className="text-xs font-semibold text-foreground/90">{label}</div>
        {subLabel && (
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{subLabel}</div>
        )}
      </div>
    </div>
  );
}
