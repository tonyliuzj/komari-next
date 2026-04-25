"use client";

import { useEffect, useState } from 'react';
import { useTheme, ColorTheme, CardDesign, CardLayout, GraphDesign, StatusDesign } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Activity, Gauge, Palette, Layout, PieChart, Image, Settings, Grid3X3, Table2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  type StatusCardsVisibility,
  useStatusCardsVisibility,
} from '@/hooks/useStatusCardsVisibility';
import { useNodeViewMode } from '@/hooks/useNodeViewMode';
import { cn } from '@/lib/utils';

const ThemeSwitcher = () => {
  const {
    themeConfig,
    setColorTheme,
    setCardLayout,
    setCardDesign,
    setStatusDesign,
    setGraphDesign,
    setBackgroundImageUrl,
  } = useTheme();
  const { t } = useTranslation();
  const [bgUrlInput, setBgUrlInput] = useState(themeConfig.backgroundImageUrl || '');
  const [statusCardsVisibility, updateStatusCardVisibility] = useStatusCardsVisibility();
  const [nodeViewMode, setNodeViewMode] = useNodeViewMode();

  useEffect(() => {
    setBgUrlInput(themeConfig.backgroundImageUrl || '');
  }, [themeConfig.backgroundImageUrl]);

  const colorThemes: { value: ColorTheme; label: string; colors: string }[] = [
    { value: 'default', label: t('themeCustomizer.colorThemes.default', { defaultValue: 'Default' }), colors: 'from-blue-500 to-purple-500' },
    { value: 'ocean', label: t('themeCustomizer.colorThemes.ocean', { defaultValue: 'Ocean' }), colors: 'from-cyan-500 to-blue-600' },
    { value: 'sunset', label: t('themeCustomizer.colorThemes.sunset', { defaultValue: 'Sunset' }), colors: 'from-orange-500 to-pink-500' },
    { value: 'forest', label: t('themeCustomizer.colorThemes.forest', { defaultValue: 'Forest' }), colors: 'from-green-500 to-emerald-600' },
    { value: 'midnight', label: t('themeCustomizer.colorThemes.midnight', { defaultValue: 'Midnight' }), colors: 'from-indigo-600 to-purple-700' },
    { value: 'rose', label: t('themeCustomizer.colorThemes.rose', { defaultValue: 'Rose' }), colors: 'from-pink-500 to-rose-600' },
  ];

  const cardLayouts: { value: CardLayout; label: string; description: string }[] = [
    {
      value: 'classic',
      label: t('themeCustomizer.cardLayouts.classic.label', { defaultValue: 'Classic' }),
      description: t('themeCustomizer.cardLayouts.classic.description', { defaultValue: 'Traditional card design' }),
    },
    {
      value: 'modern',
      label: t('themeCustomizer.cardLayouts.modern.label', { defaultValue: 'Modern' }),
      description: t('themeCustomizer.cardLayouts.modern.description', { defaultValue: 'Icon left, horizontal' }),
    },
    {
      value: 'minimal',
      label: t('themeCustomizer.cardLayouts.minimal.label', { defaultValue: 'Minimal' }),
      description: t('themeCustomizer.cardLayouts.minimal.description', { defaultValue: 'Borderless, clean' }),
    },
    {
      value: 'detailed',
      label: t('themeCustomizer.cardLayouts.detailed.label', { defaultValue: 'Detailed' }),
      description: t('themeCustomizer.cardLayouts.detailed.description', { defaultValue: 'Icon top, centered' }),
    },
  ];

  const cardDesigns: { value: CardDesign; label: string; description: string }[] = [
    {
      value: 'default',
      label: t('themeCustomizer.cardDesigns.default.label', { defaultValue: 'Default' }),
      description: t('themeCustomizer.cardDesigns.default.description', { defaultValue: 'Text ping statistics' }),
    },
    {
      value: 'quality-bars',
      label: t('themeCustomizer.cardDesigns.qualityBars.label', { defaultValue: 'History Bars' }),
      description: t('themeCustomizer.cardDesigns.qualityBars.description', { defaultValue: 'Latency and packet loss block history' }),
    },
  ];

  const statusDesigns: { value: StatusDesign; label: string; description: string }[] = [
    {
      value: 'default',
      label: t('themeCustomizer.statusDesigns.default.label', { defaultValue: 'Default' }),
      description: t('themeCustomizer.statusDesigns.default.description', { defaultValue: 'Standard status card values' }),
    },
    {
      value: 'speed',
      label: t('themeCustomizer.statusDesigns.speed.label', { defaultValue: 'Speed Gauge' }),
      description: t('themeCustomizer.statusDesigns.speed.description', { defaultValue: 'Gauge indicator for upload and download speed' }),
    },
  ];

  const graphDesigns: { value: GraphDesign; label: string; description: string }[] = [
    {
      value: 'circle',
      label: t('themeCustomizer.graphDesigns.circle.label', { defaultValue: 'Circle' }),
      description: t('themeCustomizer.graphDesigns.circle.description', { defaultValue: 'Circular progress' }),
    },
    {
      value: 'progress',
      label: t('themeCustomizer.graphDesigns.progress.label', { defaultValue: 'Progress Bar' }),
      description: t('themeCustomizer.graphDesigns.progress.description', { defaultValue: 'Linear progress' }),
    },
    {
      value: 'bar',
      label: t('themeCustomizer.graphDesigns.bar.label', { defaultValue: 'Bar Chart' }),
      description: t('themeCustomizer.graphDesigns.bar.description', { defaultValue: 'Vertical bars' }),
    },
    {
      value: 'minimal',
      label: t('themeCustomizer.graphDesigns.minimal.label', { defaultValue: 'Minimal' }),
      description: t('themeCustomizer.graphDesigns.minimal.description', { defaultValue: 'Simple text' }),
    },
  ];

  const statusSettings: Array<{ key: keyof StatusCardsVisibility; label: string }> = [
    { key: 'currentTime', label: t('current_time') },
    { key: 'currentOnline', label: t('current_online') },
    { key: 'regionOverview', label: t('region_overview') },
    { key: 'trafficOverview', label: t('traffic_overview') },
    { key: 'networkSpeed', label: t('network_speed') },
    { key: 'mapView', label: t('common.map', { defaultValue: 'Map' }) },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Palette className="h-4 w-4" />
          <span className="sr-only">
            {t('themeCustomizer.themeSettings', { defaultValue: 'Theme settings' })}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[85vh] overflow-y-auto p-4" align="end" sideOffset={8}>
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 sticky -top-4 bg-popover pb-2 z-10 -mx-4 px-4 pt-4">
              <Palette className="h-4 w-4" />
              {t('themeCustomizer.colorTheme', { defaultValue: 'Color Theme' })}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {colorThemes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setColorTheme(theme.value)}
                  className={`relative rounded-lg p-2 text-left transition-all ${
                    themeConfig.colorTheme === theme.value
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className={`h-6 w-full rounded-md bg-gradient-to-r ${theme.colors} mb-1.5`} />
                  <span className="text-[10px] font-medium">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Layout className="h-4 w-4" />
              {t('themeCustomizer.cardLayout', { defaultValue: 'Card Layout' })}
            </h4>
            <div className="flex flex-col gap-1.5">
              {cardLayouts.map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => setCardLayout(layout.value)}
                  className={`flex items-start gap-2 rounded-lg p-2 text-left transition-all ${
                    themeConfig.cardLayout === layout.value
                      ? 'bg-primary/10 border border-primary'
                      : 'border border-transparent hover:bg-accent'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-xs">{layout.label}</div>
                    <div className="text-[10px] text-muted-foreground">{layout.description}</div>
                  </div>
                  {themeConfig.cardLayout === layout.value && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t('themeCustomizer.cardDesign', { defaultValue: 'Card Design' })}
            </h4>
            <div className="flex flex-col gap-1.5">
              {cardDesigns.map((design) => (
                <button
                  key={design.value}
                  onClick={() => setCardDesign(design.value)}
                  className={`flex items-start gap-2 rounded-lg p-2 text-left transition-all ${
                    themeConfig.cardDesign === design.value
                      ? 'bg-primary/10 border border-primary'
                      : 'border border-transparent hover:bg-accent'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-xs">{design.label}</div>
                    <div className="text-[10px] text-muted-foreground">{design.description}</div>
                  </div>
                  {themeConfig.cardDesign === design.value && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t("status_settings")}
            </h4>
            <div className="flex flex-col gap-3">
              {statusSettings.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </span>
                  <Switch
                    checked={statusCardsVisibility[item.key]}
                    onCheckedChange={(checked) =>
                      updateStatusCardVisibility(item.key, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              {t('themeCustomizer.statusDesign', { defaultValue: 'Status Design' })}
            </h4>
            <div className="flex flex-col gap-1.5">
              {statusDesigns.map((design) => (
                <button
                  key={design.value}
                  onClick={() => setStatusDesign(design.value)}
                  className={`flex items-start gap-2 rounded-lg p-2 text-left transition-all ${
                    themeConfig.statusDesign === design.value
                      ? 'bg-primary/10 border border-primary'
                      : 'border border-transparent hover:bg-accent'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-xs">{design.label}</div>
                    <div className="text-[10px] text-muted-foreground">{design.description}</div>
                  </div>
                  {themeConfig.statusDesign === design.value && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Layout className="h-4 w-4" />
              {t("nodeDisplay.defaultView", { defaultValue: "Default View" })}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={nodeViewMode === "grid" ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-9 justify-center gap-2 text-xs",
                  nodeViewMode === "grid" && "bg-primary/10 border-primary"
                )}
                onClick={() => setNodeViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
                {t("nodeDisplay.grid", { defaultValue: "Grid" })}
              </Button>
              <Button
                type="button"
                variant={nodeViewMode === "table" ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-9 justify-center gap-2 text-xs",
                  nodeViewMode === "table" && "bg-primary/10 border-primary"
                )}
                onClick={() => setNodeViewMode("table")}
              >
                <Table2 className="h-4 w-4" />
                {t("nodeDisplay.table", { defaultValue: "Table" })}
              </Button>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              {t('themeCustomizer.graphDesign', { defaultValue: 'Graph Design' })}
            </h4>
            <div className="flex flex-col gap-1.5">
              {graphDesigns.map((design) => (
                <button
                  key={design.value}
                  onClick={() => setGraphDesign(design.value)}
                  className={`flex items-start gap-2 rounded-lg p-2 text-left transition-all ${
                    themeConfig.graphDesign === design.value
                      ? 'bg-primary/10 border border-primary'
                      : 'border border-transparent hover:bg-accent'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-xs">{design.label}</div>
                    <div className="text-[10px] text-muted-foreground">{design.description}</div>
                  </div>
                  {themeConfig.graphDesign === design.value && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Image className="h-4 w-4" />
              {t('themeCustomizer.backgroundImage', { defaultValue: 'Background Image' })}
            </h4>
            <div className="flex flex-col gap-2">
              <Input
                type="url"
                placeholder={t('themeCustomizer.backgroundImagePlaceholder', { defaultValue: 'Enter image URL' })}
                value={bgUrlInput}
                onChange={(e) => setBgUrlInput(e.target.value)}
                className="text-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 text-xs h-8"
                  onClick={() => setBackgroundImageUrl(bgUrlInput)}
                >
                  {t('themeCustomizer.apply', { defaultValue: 'Apply' })}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-8"
                  onClick={() => {
                    setBgUrlInput('');
                    setBackgroundImageUrl('');
                  }}
                >
                  {t('themeCustomizer.clear', { defaultValue: 'Clear' })}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ThemeSwitcher;
