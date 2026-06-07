import React from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, ArrowUp, ArrowDown, Activity, Upload, Download } from "lucide-react";
import type { TFunction } from "i18next";

import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData, Record } from "../types/LiveData";
import { getOSImage, getOSName } from "@/utils";
import { formatBytes } from "@/utils/unitHelper";
import { useTheme } from "@/contexts/ThemeContext";
import { type PingHistoryPoint, type PingStats, usePingStats } from "@/hooks/usePingStats";

import Flag from "./Flag";
import PriceTags from "./PriceTags";
import AdaptiveChart from "./AdaptiveChart";
import MiniPingChartFloat from "./MiniPingChartFloat";
import SpaLink from "./SpaLink";
import Tips from "./ui/tips";

// --- Helper Functions ---

/** Format seconds into readable uptime */
export function formatUptime(seconds: number, t: TFunction): string {
  if (!seconds || seconds < 0) return t("nodeCard.time_second", { val: 0 });
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d} ${t("nodeCard.time_day")}`);
  if (h) parts.push(`${h} ${t("nodeCard.time_hour")}`);
  if (m) parts.push(`${m} ${t("nodeCard.time_minute")}`);
  if (s || parts.length === 0) parts.push(`${s} ${t("nodeCard.time_second")}`);
  return parts.join(" ");
}

export function getTrafficPercentage(totalUp: number, totalDown: number, limit: number, type: "max" | "min" | "sum" | "up" | "down") {
  if (limit === 0) return 0;
  switch (type) {
    case "max":
      return Math.max(totalUp, totalDown) / limit * 100;
    case "min":
      return Math.min(totalUp, totalDown) / limit * 100;
    case "sum":
      return (totalUp + totalDown) / limit * 100;
    case "up":
      return totalUp / limit * 100;
    case "down":
      return totalDown / limit * 100;
    default:
      return 0;
  }
}

export function getTrafficUsed(totalUp: number, totalDown: number, type: "max" | "min" | "sum" | "up" | "down") {
  switch (type) {
    case "max":
      return Math.max(totalUp, totalDown);
    case "min":
      return Math.min(totalUp, totalDown);
    case "sum":
      return totalUp + totalDown;
    case "up":
      return totalUp;
    case "down":
      return totalDown;
    default:
      return 0;
  }
}

export function formatTrafficPercentage(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  if (value >= 100) return `${value.toFixed(1)}%`;
  if (value >= 10) return `${value.toFixed(1)}%`;
  if (value >= 1) return `${value.toFixed(2)}%`;
  if (value >= 0.01) return `${value.toFixed(3)}%`;
  return "<0.01%";
}

type QualityTone = "good" | "warn" | "bad";

const PING_HISTORY_PLACEHOLDER_POINTS: PingHistoryPoint[] = Array.from(
  { length: 28 },
  (_, index) => ({
    time: `placeholder-${index}`,
    latency: null,
    loss: null,
  })
);

const qualityToneStyles: {
  [tone in QualityTone]: { bar: string };
} = {
  good: {
    bar: "bg-emerald-500",
  },
  warn: {
    bar: "bg-amber-500",
  },
  bad: {
    bar: "bg-rose-500",
  },
};

function getLatencyTone(latency: number): QualityTone {
  if (latency <= 80) return "good";
  if (latency <= 180) return "warn";
  return "bad";
}

function getLossTone(loss: number): QualityTone {
  if (loss <= 1) return "good";
  if (loss <= 5) return "warn";
  return "bad";
}

function formatHistoryTime(time: string) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString([], {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PingHistoryStrip({
  label,
  value,
  points,
  metric,
  isLoaded,
}: {
  label: string;
  value: string;
  points: PingHistoryPoint[];
  metric: "latency" | "loss";
  isLoaded: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/45 bg-background/45 px-2 py-1.5">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] leading-none">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 font-mono font-semibold text-foreground/80">{value}</span>
      </div>
      <div className="flex h-5 gap-0.5">
        {points.filter(p => p.latency !== null || !isLoaded).map((point, index) => {
          const metricValue = point[metric];
          const tone =
            metricValue === null
              ? null
              : metric === "latency"
                ? getLatencyTone(metricValue)
                : getLossTone(metricValue);
          const blockClassName = tone
            ? qualityToneStyles[tone].bar
            : "bg-muted-foreground/18";
          const titleValue =
            metricValue === null
              ? "No data"
              : metric === "latency"
                ? `${Math.round(metricValue)} ms`
                : `${metricValue.toFixed(1)}%`;

          return (
            <span
              key={`${point.time}-${index}`}
              className={`flex-1 min-w-[2px] rounded-[2px] ${blockClassName}`}
              title={`${formatHistoryTime(point.time)} ${titleValue}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function PingQualityBars({ pingStats, t }: { pingStats: PingStats; t: TFunction }) {
  const historyPoints = pingStats.hasData && pingStats.history.length > 0
    ? pingStats.history
    : PING_HISTORY_PLACEHOLDER_POINTS;
  const statusText = pingStats.hasData
    ? `${pingStats.avgVolatility.toFixed(1)} ${t("chart.volatility")}`
    : pingStats.isLoaded
      ? t("nodeCard.noPingData")
      : "--";
  const latencyValue = pingStats.hasData
    ? `${Math.round(pingStats.avgLatency)} ms`
    : "-- ms";
  const lossValue = pingStats.hasData
    ? `${pingStats.avgLoss.toFixed(1)}%`
    : "--%";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{t("nodeCard.pingStats")}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {statusText}
        </span>
      </div>
      {(!pingStats.isLoaded || pingStats.hasData) && (
        <div className="grid grid-cols-2 gap-2">
          <PingHistoryStrip
            label={t("nodeCard.latency", { defaultValue: "Latency" })}
            value={latencyValue}
            points={historyPoints}
            metric="latency"
            isLoaded={pingStats.isLoaded}
          />
          <PingHistoryStrip
            label={t("chart.lossRate", { defaultValue: "Loss" })}
            value={lossValue}
            points={historyPoints}
            metric="loss"
            isLoaded={pingStats.isLoaded}
          />
        </div>
      )}
    </div>
  );
}

// --- Components ---

interface NodeProps {
  basic: NodeBasicInfo;
  live: Record | undefined;
  online: boolean;
  pingStatsEnabled?: boolean;
}

const Node = ({ basic, live, online, pingStatsEnabled = false }: NodeProps) => {
  const [t] = useTranslation();
  const { themeConfig } = useTheme();
  const pingStats = usePingStats(basic.uuid, 24, pingStatsEnabled);

  const defaultLive = {
    cpu: { usage: 0 },
    ram: { used: 0 },
    disk: { used: 0 },
    network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
    uptime: 0,
  } as Record;

  const liveData = live || defaultLive;

  // Calculate percentages
  const memoryUsagePercent = basic.mem_total
    ? (liveData.ram.used / basic.mem_total) * 100
    : 0;
  const diskUsagePercent = basic.disk_total
    ? (liveData.disk.used / basic.disk_total) * 100
    : 0;

  // Format network data
  const uploadSpeed = formatBytes(liveData.network.up);
  const downloadSpeed = formatBytes(liveData.network.down);
  const totalUpload = formatBytes(liveData.network.totalUp);
  const totalDownload = formatBytes(liveData.network.totalDown);
  const trafficLimitType = basic.traffic_limit_type ?? "sum";
  const trafficUsed = getTrafficUsed(
    liveData.network.totalUp,
    liveData.network.totalDown,
    trafficLimitType
  );
  const trafficPercentage = getTrafficPercentage(
    liveData.network.totalUp,
    liveData.network.totalDown,
    basic.traffic_limit,
    trafficLimitType
  );

  // Layout-specific styles
  const cardStyles = {
    classic: "flex h-full w-full flex-col transition-all duration-200 hover:shadow-lg hover:border-primary/50 overflow-hidden group border",
    modern: "flex h-full w-full flex-col transition-all duration-200 hover:shadow-lg overflow-hidden group border-none bg-gradient-to-br from-card to-card/50 shadow-sm",
    minimal: "flex h-full w-full flex-col transition-all duration-200 hover:shadow-md overflow-hidden group bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border border-border/50",
    detailed: "flex h-full w-full flex-col transition-all duration-200 hover:shadow-xl overflow-hidden group border-2 shadow-md hover:border-primary/30",
    compact: "flex h-full w-full flex-col transition-all duration-200 hover:shadow-lg hover:border-primary/50 overflow-hidden group border",
  };

  const headerStyles = {
    classic: "pb-2 pt-4 px-4 space-y-0",
    modern: "pb-3 pt-3 px-4 space-y-0 bg-primary/5 border-b border-primary/10",
    minimal: "pb-2 pt-4 px-4 space-y-0",
    detailed: "pb-3 pt-5 px-5 space-y-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-b-2",
    compact: "pb-2 pt-4 px-4 space-y-0",
  };

  const contentStyles = {
    classic: "px-4 pb-2 pt-4",
    modern: "px-4 pb-2 pt-4 bg-gradient-to-b from-background/50 to-transparent",
    minimal: "px-4 pb-2 pt-3",
    detailed: "px-5 pb-2 pt-4 bg-gradient-to-b from-background to-muted/10",
    compact: "px-4 pb-2 pt-3",
  };

  const footerStyles = {
    classic: "shrink-0 pb-3 pt-0 px-4 flex justify-between items-center",
    modern: "shrink-0 pb-3 pt-0 px-4 flex justify-between items-center bg-muted/20 border-t",
    minimal: "shrink-0 pb-3 pt-0 px-4 flex justify-between items-center",
    detailed: "shrink-0 pb-4 pt-0 px-5 flex justify-between items-center bg-muted/30 border-t-2",
    compact: "shrink-0 pb-3 pt-0 px-4 flex justify-between items-center",
  };

  return (
    <Card
      id={basic.uuid}
      className={cardStyles[themeConfig.cardLayout] || cardStyles.classic}
    >
      {/* Header: Identity & Status */}
      <CardHeader className={headerStyles[themeConfig.cardLayout] || headerStyles.classic}>
        <div className="flex justify-between items-start">
          <div className="flex flex-1 min-w-0 items-center gap-3 overflow-hidden">
            {/* Flag position changes based on layout */}
            {themeConfig.cardLayout !== 'detailed' && (
              <div className="flex-shrink-0">
                <Flag flag={basic.region} />
              </div>
            )}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex flex-row min-w-0 items-center">
                <SpaLink href={`/instance/${basic.uuid}`} className="group-hover:text-primary transition-colors overflow-hidden flex-1">
                  <h3 className={`font-bold truncate pr-2 tracking-tight ${
                    themeConfig.cardLayout === 'detailed' ? 'text-lg' : 'text-base'
                  }`}>{basic.name}</h3>
                </SpaLink>
                <div className="flex items-center gap-1 shrink-0">
                  {live?.message && <Tips color="#CE282E">{live.message}</Tips>}
                  <MiniPingChartFloat
                    uuid={basic.uuid}
                    hours={24}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                        <TrendingUp className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Badge variant={online ? "default" : "destructive"} className={online ? "bg-green-600 hover:bg-green-700" : ""}>
                    {online ? t("nodeCard.online") : t("nodeCard.offline")}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center text-[11px] text-muted-foreground/80 gap-2 mt-0.5">
                <span className="flex items-center gap-1.5 bg-muted/50 px-1.5 py-0.5 rounded min-w-0">
                  <img src={getOSImage(basic.os)} alt={basic.os} className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{getOSName(basic.os)}</span>
                </span>
                {themeConfig.cardLayout === 'detailed' && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded text-primary">
                    <Flag flag={basic.region} />
                  </span>
                )}
                <span className="opacity-40">•</span>
                <span>{formatUptime(liveData.uptime, t)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {themeConfig.cardLayout !== 'minimal' && <Separator className="opacity-50" />}

      {/* Main Content: Metrics */}
      <CardContent className={contentStyles[themeConfig.cardLayout] || contentStyles.classic}>
        {themeConfig.cardLayout === 'compact' ? (
          /* ── Compact Layout ── */
          (() => {
            // 流量进度百分比（无限流量时为 0，格子始终显示）
            const compactTrafficPct = basic.traffic_limit > 0 ? trafficPercentage : 0;
            // 流量下方小字
            const compactTrafficSub = basic.traffic_limit > 0
              ? `${formatBytes(trafficUsed)} / ${formatBytes(basic.traffic_limit)}`
              : `${formatBytes(liveData.network.totalUp + liveData.network.totalDown)} / ∞`;

            // 价格行文字（上行）：免费直接显示【免费】，付费显示价格/周期
            const compactPriceLine = (() => {
              if (!basic.price || basic.price <= 0) return t("common.free", { defaultValue: "免费" });
              const cycleLabel = (() => {
                if (basic.billing_cycle >= 27 && basic.billing_cycle <= 32) return t("common.monthly");
                if (basic.billing_cycle >= 87 && basic.billing_cycle <= 95) return t("common.quarterly");
                if (basic.billing_cycle >= 175 && basic.billing_cycle <= 185) return t("common.semi_annual");
                if (basic.billing_cycle >= 360 && basic.billing_cycle <= 370) return t("common.annual");
                if (basic.billing_cycle >= 720 && basic.billing_cycle <= 750) return t("common.biennial");
                if (basic.billing_cycle == -1) return t("common.once");
                return `${basic.billing_cycle}${t("nodeCard.time_day")}`;
              })();
              return `${basic.currency}${basic.price}/${cycleLabel}`;
            })();

            // 剩余天数行文字（下行）
            const compactExpiryLine = (() => {
              if (!basic.expired_at) {
                // 无截止时间：付费显示【长期】，免费也显示【长期】
                return t("common.long_term", { defaultValue: "长期" });
              }
              const expiredDate = new Date(basic.expired_at);
              const now = new Date();
              const diffDays = Math.ceil((expiredDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays <= 0) return t("common.expired", { defaultValue: "已到期" });
              if (diffDays > 36500) return t("common.long_term", { defaultValue: "长期" });
              return t("common.expired_in", { days: diffDays, defaultValue: `余${diffDays}天` });
            })();

            const hasPriceInfo = basic.price !== undefined || basic.expired_at;

            // CPU 负载小字：1min / 5min / 15min 平均负载
            const cpuLoadSub = `${liveData.load.load1.toFixed(2)}, ${liveData.load.load5.toFixed(2)}, ${liveData.load.load15.toFixed(2)}`;

            return (
              <div className="space-y-2 text-sm">

                {/* ── 第一行：CPU（左）/ 内存（右）── */}
                <div className="grid grid-cols-2 gap-x-3">
                  {/* CPU 格：进度条下方小字左对齐，显示1/5/15分钟平均负载 */}
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground text-xs">CPU</span>
                      <span className="font-mono text-xs text-foreground/80">{liveData.cpu.usage.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-transform duration-500 origin-left"
                        style={{ transform: `scaleX(${Math.min(liveData.cpu.usage, 100) / 100})` }}
                      />
                    </div>
                    <div className="mt-0.5 text-[10px] font-mono text-muted-foreground text-left">
                      {cpuLoadSub}
                    </div>
                  </div>
                  {/* 内存 格：进度条下方小字右对齐 */}
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground text-xs">{t("nodeCard.ram", { defaultValue: "内存" })}</span>
                      <span className="font-mono text-xs text-foreground/80">{memoryUsagePercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-transform duration-500 origin-left"
                        style={{ transform: `scaleX(${Math.min(memoryUsagePercent, 100) / 100})` }}
                      />
                    </div>
                    <div className="mt-0.5 text-[10px] font-mono text-muted-foreground text-right">
                      {`${formatBytes(liveData.ram.used)} / ${formatBytes(basic.mem_total)}`}
                    </div>
                  </div>
                </div>

                {/* ── 第二行：硬盘（左）/ 流量（右）── */}
                <div className="grid grid-cols-2 gap-x-3">
                  {/* 硬盘 格：进度条下方小字左对齐 */}
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground text-xs">{t("nodeCard.disk", { defaultValue: "硬盘" })}</span>
                      <span className="font-mono text-xs text-foreground/80">{diskUsagePercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-transform duration-500 origin-left"
                        style={{ transform: `scaleX(${Math.min(diskUsagePercent, 100) / 100})` }}
                      />
                    </div>
                    <div className="mt-0.5 text-[10px] font-mono text-muted-foreground text-left">
                      {`${formatBytes(liveData.disk.used)} / ${formatBytes(basic.disk_total)}`}
                    </div>
                  </div>
                  {/* 流量 格：无限流量也显示，进度条下方小字右对齐 */}
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground text-xs">{t("nodeCard.totalTraffic", { defaultValue: "流量" })}</span>
                      <span className="font-mono text-xs text-foreground/80">
                        {basic.traffic_limit > 0 ? `${formatTrafficPercentage(compactTrafficPct)}` : "∞"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      {basic.traffic_limit > 0 && (
                        <div
                          className="h-full bg-primary/70 rounded-full transition-transform duration-500 origin-left"
                          style={{ transform: `scaleX(${Math.min(compactTrafficPct, 100) / 100})` }}
                        />
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] font-mono text-muted-foreground text-right">
                      {compactTrafficSub}
                    </div>
                  </div>
                </div>

                <Separator className="opacity-30" />

                {/* ── 第三行：三个等宽独立方块 ── */}
                <div className="grid grid-cols-3 gap-1.5">
                  {/* 左方块：实时网速，Upload/Download 图标区分上下行 */}
                  <div className="min-w-0 rounded-md bg-muted/40 px-2 py-1.5 flex flex-col justify-center gap-0.5">
                    <span className="flex items-center font-mono text-[11px] text-green-600 dark:text-green-400 truncate">
                      <Upload className="h-3 w-3 mr-1 shrink-0" />{uploadSpeed}/s
                    </span>
                    <span className="flex items-center font-mono text-[11px] text-blue-600 dark:text-blue-400 truncate">
                      <Download className="h-3 w-3 mr-1 shrink-0" />{downloadSpeed}/s
                    </span>
                  </div>
                  {/* 中方块：累计流量统计，用 ArrowUp/Down 轮廓箭头区分 */}
                  <div className="min-w-0 rounded-md bg-muted/40 px-2 py-1.5 flex flex-col justify-center gap-0.5">
                    <span className="flex items-center font-mono text-[11px] text-muted-foreground truncate">
                      <ArrowUp className="h-3 w-3 mr-1 shrink-0" />{totalUpload}
                    </span>
                    <span className="flex items-center font-mono text-[11px] text-muted-foreground truncate">
                      <ArrowDown className="h-3 w-3 mr-1 shrink-0" />{totalDownload}
                    </span>
                  </div>
                  {/* 右方块：价格（上行）/ 剩余天数（下行） */}
                  <div className="min-w-0 rounded-md bg-muted/40 px-2 py-1.5 flex flex-col justify-center gap-0.5 items-end">
                    {hasPriceInfo ? (
                      <>
                        <span className="font-mono text-[11px] text-muted-foreground truncate w-full text-right">{compactPriceLine}</span>
                        <span className="font-mono text-[11px] text-muted-foreground truncate w-full text-right">{compactExpiryLine}</span>
                      </>
                    ) : (
                      <span className="font-mono text-[11px] text-muted-foreground/40 text-right">--</span>
                    )}
                  </div>
                </div>

                <Separator className="opacity-30" />

                {/* ── 延迟/丢包行，依 cardDesign 切换 ── */}
                {themeConfig.cardDesign === "quality-bars" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <PingHistoryStrip
                      label={t("nodeCard.ping", { defaultValue: "延迟" })}
                      value={pingStats.hasData ? `${Math.round(pingStats.avgLatency)} ms` : "-- ms"}
                      points={pingStats.hasData && pingStats.history.length > 0 ? pingStats.history : PING_HISTORY_PLACEHOLDER_POINTS}
                      metric="latency"
                      isLoaded={pingStats.isLoaded}
                    />
                    <PingHistoryStrip
                      label={t("chart.lossRate", { defaultValue: "丢包" })}
                      value={pingStats.hasData ? `${pingStats.avgLoss.toFixed(1)}%` : "--%"}
                      points={pingStats.hasData && pingStats.history.length > 0 ? pingStats.history : PING_HISTORY_PLACEHOLDER_POINTS}
                      metric="loss"
                      isLoaded={pingStats.isLoaded}
                    />
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">{t("nodeCard.pingStats")}</span>
                    {pingStats.hasData ? (
                      <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                        <span>{pingStats.avgLoss.toFixed(1)}% {t("chart.lossRate")}</span>
                        <span>{pingStats.avgVolatility.toFixed(1)} {t("chart.volatility")}</span>
                      </div>
                    ) : !pingStats.isLoaded ? (
                      <div className="flex gap-3 font-mono text-xs text-muted-foreground/70">
                        <span>--% {t("chart.lossRate")}</span>
                        <span>-- {t("chart.volatility")}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/70 italic">{t("nodeCard.noPingData")}</span>
                    )}
                  </div>
                )}

              </div>
            );
          })()
        ) : (
          /* ── Classic / Modern / Minimal / Detailed Layouts ── */
          <>
        {/* Charts Grid - layout affects arrangement */}
        <div className={`grid mb-4 ${
          themeConfig.cardLayout === 'minimal' ? 'grid-cols-3 gap-3' :
          themeConfig.cardLayout === 'detailed' ? 'grid-cols-3 gap-4' :
          themeConfig.cardLayout === 'modern' ? 'grid-cols-3 gap-2' :
          'grid-cols-3 gap-2'
        }`}>
          <AdaptiveChart
            value={liveData.cpu.usage}
            label="CPU"
            subLabel={`${liveData.cpu.usage.toFixed(1)}%`}
            animate
          />
          <AdaptiveChart
            value={memoryUsagePercent}
            label="RAM"
            subLabel={themeConfig.showRamDiskTotal ? `${formatBytes(liveData.ram.used)} / ${formatBytes(basic.mem_total)}` : formatBytes(liveData.ram.used)}
            animate
          />
          <AdaptiveChart
            value={diskUsagePercent}
            label="Disk"
            subLabel={themeConfig.showRamDiskTotal ? `${formatBytes(liveData.disk.used)} / ${formatBytes(basic.disk_total)}` : formatBytes(liveData.disk.used)}
            animate
          />
        </div>

        {/* Network Stats */}
        <div className={`rounded-lg p-3 space-y-2 text-sm ${
          themeConfig.cardLayout === 'modern' ? 'bg-primary/5 border border-primary/10' :
          themeConfig.cardLayout === 'minimal' ? 'bg-background/50 border border-border/30' :
          themeConfig.cardLayout === 'detailed' ? 'bg-muted/40 border-2 border-muted' :
          'bg-muted/30'
        }`}>
          <div className="flex justify-between items-center">
             <span className="text-muted-foreground flex items-center gap-1">
               <Activity className="h-3 w-3" /> {t("nodeCard.networkSpeed")}
             </span>
             <div className="flex gap-3 font-mono text-xs">
                <span className="flex items-center text-green-600 dark:text-green-400">
                  <ArrowUp className="h-3 w-3 mr-0.5" /> {uploadSpeed}/s
                </span>
                <span className="flex items-center text-blue-600 dark:text-blue-400">
                  <ArrowDown className="h-3 w-3 mr-0.5" /> {downloadSpeed}/s
                </span>
             </div>
          </div>
          
          <Separator className="opacity-30" />
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1">
               {t("nodeCard.totalTraffic")}
            </span>
             <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                <span className="flex items-center">
                  <ArrowUp className="h-3 w-3 mr-0.5" /> {totalUpload}
                </span>
                <span className="flex items-center">
                  <ArrowDown className="h-3 w-3 mr-0.5" /> {totalDownload}
                </span>
             </div>
          </div>

          <Separator className="opacity-30" />

          {/* Ping Statistics */}
          {themeConfig.cardDesign === "quality-bars" ? (
            <PingQualityBars pingStats={pingStats} t={t} />
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t("nodeCard.pingStats")}</span>
              {pingStats.hasData ? (
                <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                  <span>{pingStats.avgLoss.toFixed(1)}% {t("chart.lossRate")}</span>
                  <span>{pingStats.avgVolatility.toFixed(1)} {t("chart.volatility")}</span>
                </div>
              ) : !pingStats.isLoaded ? (
                <div className="flex gap-3 font-mono text-xs text-muted-foreground/70">
                  <span>--% {t("chart.lossRate")}</span>
                  <span>-- {t("chart.volatility")}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/70 italic">{t("nodeCard.noPingData")}</span>
              )}
            </div>
          )}

          {/* Traffic Limit Progress (if exists) */}
          {basic.traffic_limit > 0 && (
            <div className="mt-2 pt-1">
               <div className="flex justify-between text-[10px] mb-1 text-muted-foreground">
                 <span>{trafficLimitType.toUpperCase()} Limit</span>
                 <span className="font-mono">
                   {formatBytes(trafficUsed)} / {formatBytes(basic.traffic_limit)}
                 </span>
               </div>
               <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-primary/70 rounded-full transition-transform duration-500 origin-left"
                   style={{ transform: `scaleX(${Math.min(trafficPercentage, 100) / 100})` }}
                 />
               </div>
               <div className="mt-1 flex justify-end text-[10px] font-mono text-muted-foreground">
                 <span>{formatTrafficPercentage(trafficPercentage)}</span>
               </div>
            </div>
          )}
        </div>
          </>
        )}
      </CardContent>

      {/* Footer: Price & Extra Info */}
      {themeConfig.cardLayout === 'compact' ? (
        /* compact footer: 只显示自定义tags，不显示 V4/V6、价格、剩余天数 */
        basic.tags && basic.tags.trim() !== '' && (
          <CardFooter className={footerStyles.compact}>
            <PriceTags
              hidden={false}
              price={0}
              tags={basic.tags}
              ip4={undefined}
              ip6={undefined}
            />
          </CardFooter>
        )
      ) : (
        (basic.price || basic.ipv4 || basic.ipv6) && (
          <CardFooter className={footerStyles[themeConfig.cardLayout] || footerStyles.classic}>
             <PriceTags
                hidden={false}
                price={basic.price}
                billing_cycle={basic.billing_cycle}
                expired_at={basic.expired_at}
                currency={basic.currency}
                tags={basic.tags}
                ip4={basic.ipv4}
                ip6={basic.ipv6}
             />
          </CardFooter>
        )
      )}
    </Card>
  );
};

export default Node;

// --- NodeGrid Component ---

type NodeGridProps = {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
};

type QueuedPingStatsRow = {
  rowIndex: number;
  uuids: string[];
};

const NODE_GRID_MIN_COLUMN_WIDTH = 320;
const NODE_GRID_GAP = 24;
const PING_STATS_ROW_LOAD_DELAY_MS = 400;
const PING_STATS_ROW_ROOT_MARGIN = "360px 0px";

export const NodeGrid = ({ nodes, liveData }: NodeGridProps) => {
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = React.useState(1);
  const { themeConfig } = useTheme();
  const isCompact = themeConfig.cardLayout === 'compact';
  const NODE_GRID_MIN_COL = isCompact ? 320 : NODE_GRID_MIN_COLUMN_WIDTH;
  const [pingStatsActiveNodes, setPingStatsActiveNodes] = React.useState<Set<string>>(
    () => new Set()
  );
  const pingStatsActiveNodesRef = React.useRef(pingStatsActiveNodes);
  const rowUuidsByIndexRef = React.useRef<string[][]>([]);
  const activeRowItemsRef = React.useRef<Map<number, Set<string>>>(new Map());
  const queuedRowsRef = React.useRef<QueuedPingStatsRow[]>([]);
  const queuedRowKeysRef = React.useRef<Set<string>>(new Set());
  const rowLoadTimerRef = React.useRef<number | null>(null);
  const processNextRowRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    pingStatsActiveNodesRef.current = pingStatsActiveNodes;
  }, [pingStatsActiveNodes]);

  React.useEffect(() => {
    processNextRowRef.current = () => {
      if (rowLoadTimerRef.current !== null) return;

      const queuedRow = queuedRowsRef.current.shift();
      if (!queuedRow) return;

      const rowKey = String(queuedRow.rowIndex);
      queuedRowKeysRef.current.delete(rowKey);
      const rowIsActive = (activeRowItemsRef.current.get(queuedRow.rowIndex)?.size || 0) > 0;
      const pendingUuids = rowIsActive
        ? queuedRow.uuids.filter((uuid) => !pingStatsActiveNodesRef.current.has(uuid))
        : [];

      if (pendingUuids.length > 0) {
        setPingStatsActiveNodes((previous) => {
          const next = new Set(previous);
          pendingUuids.forEach((uuid) => next.add(uuid));
          pingStatsActiveNodesRef.current = next;
          return next;
        });
      }

      rowLoadTimerRef.current = window.setTimeout(() => {
        rowLoadTimerRef.current = null;
        processNextRowRef.current();
      }, PING_STATS_ROW_LOAD_DELAY_MS);
    };

    return () => {
      if (rowLoadTimerRef.current !== null) {
        window.clearTimeout(rowLoadTimerRef.current);
        rowLoadTimerRef.current = null;
      }
    };
  }, []);

  const deactivatePingStatsRow = React.useCallback((rowIndex: number) => {
    const rowUuids = rowUuidsByIndexRef.current[rowIndex] || [];
    const rowKey = String(rowIndex);
    queuedRowKeysRef.current.delete(rowKey);
    queuedRowsRef.current = queuedRowsRef.current.filter(
      (queuedRow) => queuedRow.rowIndex !== rowIndex
    );

    if (rowUuids.length === 0) return;

    setPingStatsActiveNodes((previous) => {
      const next = new Set(previous);
      let changed = false;
      rowUuids.forEach((uuid) => {
        if (next.delete(uuid)) {
          changed = true;
        }
      });

      if (!changed) return previous;
      pingStatsActiveNodesRef.current = next;
      return next;
    });
  }, []);

  const enqueuePingStatsRow = React.useCallback((rowIndex: number, rowUuids: string[]) => {
    if (rowUuids.length === 0) return;
    if ((activeRowItemsRef.current.get(rowIndex)?.size || 0) === 0) return;

    const pendingUuids = rowUuids.filter(
      (uuid) => !pingStatsActiveNodesRef.current.has(uuid)
    );
    if (pendingUuids.length === 0) return;

    const rowKey = String(rowIndex);
    if (queuedRowKeysRef.current.has(rowKey)) return;

    queuedRowKeysRef.current.add(rowKey);
    queuedRowsRef.current.push({ rowIndex, uuids: rowUuids });
    processNextRowRef.current();
  }, []);

  const markPingStatsRowItem = React.useCallback((
    rowIndex: number,
    uuid: string,
    isActive: boolean
  ) => {
    const activeRows = activeRowItemsRef.current;
    const rowItems = activeRows.get(rowIndex) || new Set<string>();

    if (isActive) {
      rowItems.add(uuid);
      activeRows.set(rowIndex, rowItems);
      enqueuePingStatsRow(rowIndex, rowUuidsByIndexRef.current[rowIndex] || []);
      return;
    }

    rowItems.delete(uuid);
    if (rowItems.size > 0) {
      activeRows.set(rowIndex, rowItems);
      return;
    }

    activeRows.delete(rowIndex);
    deactivatePingStatsRow(rowIndex);
  }, [deactivatePingStatsRow, enqueuePingStatsRow]);

  React.useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateColumns = () => {
      const computedStyle = window.getComputedStyle(grid);
      const columnGap = Number.parseFloat(computedStyle.columnGap) || NODE_GRID_GAP;
      const nextColumns = Math.max(
        1,
        Math.floor((grid.clientWidth + columnGap) / (NODE_GRID_MIN_COL + columnGap))
      );
      setColumns((previous) => (previous === nextColumns ? previous : nextColumns));
    };

    updateColumns();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateColumns);
      return () => window.removeEventListener("resize", updateColumns);
    }

    const resizeObserver = new ResizeObserver(updateColumns);
    resizeObserver.observe(grid);

    return () => resizeObserver.disconnect();
  }, []);

  const onlineNodes = React.useMemo(() => liveData?.online ?? [], [liveData?.online]);

  const sortedNodes = React.useMemo(() => {
    return [...nodes].sort((a, b) => {
      const aOnline = onlineNodes.includes(a.uuid);
      const bOnline = onlineNodes.includes(b.uuid);

      if (aOnline !== bOnline) {
        return aOnline ? -1 : 1;
      }

      return a.weight - b.weight;
    });
  }, [nodes, onlineNodes]);

  const rowUuidsByIndex = React.useMemo(() => {
    const rows: string[][] = [];
    sortedNodes.forEach((node, index) => {
      const rowIndex = Math.floor(index / columns);
      if (!rows[rowIndex]) rows[rowIndex] = [];
      rows[rowIndex].push(node.uuid);
    });
    return rows;
  }, [sortedNodes, columns]);

  React.useEffect(() => {
    rowUuidsByIndexRef.current = rowUuidsByIndex;
  }, [rowUuidsByIndex]);

  React.useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const gridItems = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-node-grid-item='true']")
    );

    if (typeof IntersectionObserver === "undefined") {
      const firstRowUuids = rowUuidsByIndex[0] || [];
      activeRowItemsRef.current.set(0, new Set(firstRowUuids));
      enqueuePingStatsRow(0, firstRowUuids);

      return () => {
        activeRowItemsRef.current.delete(0);
        deactivatePingStatsRow(0);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const item = entry.target as HTMLElement;
          const rowIndex = Number(item.dataset.rowIndex);
          const uuid = item.dataset.nodeUuid;
          if (!uuid) return;
          if (!Number.isFinite(rowIndex)) return;
          markPingStatsRowItem(rowIndex, uuid, entry.isIntersecting);
        });
      },
      {
        root: null,
        rootMargin: PING_STATS_ROW_ROOT_MARGIN,
        threshold: 0.01,
      }
    );

    gridItems.forEach((item) => observer.observe(item));

    return () => {
      observer.disconnect();
      activeRowItemsRef.current.forEach((_rowItems, rowIndex) => {
        deactivatePingStatsRow(rowIndex);
      });
      activeRowItemsRef.current.clear();
    };
  }, [deactivatePingStatsRow, enqueuePingStatsRow, markPingStatsRowItem, rowUuidsByIndex]);

  return (
    <div
      ref={gridRef}
      className="grid gap-6 py-4 box-border w-full"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${NODE_GRID_MIN_COL}px, 1fr))`,
      }}
    >
      {sortedNodes.map((node, index) => {
        const isOnline = onlineNodes.includes(node.uuid);
        const nodeData =
          liveData && liveData.data ? liveData.data[node.uuid] : undefined;
        const rowIndex = Math.floor(index / columns);

        return (
          <div
            key={node.uuid}
            data-node-grid-item="true"
            data-row-index={rowIndex}
            data-node-uuid={node.uuid}
            className="flex min-w-0"
          >
            <Node
              basic={node}
              live={nodeData}
              online={isOnline}
              pingStatsEnabled={pingStatsActiveNodes.has(node.uuid)}
            />
          </div>
        );
      })}
    </div>
  );
};
