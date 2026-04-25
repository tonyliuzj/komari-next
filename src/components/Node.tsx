import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { TrendingUp, ArrowUp, ArrowDown, Activity } from "lucide-react";
import type { TFunction } from "i18next";

import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData, Record } from "../types/LiveData";
import { useIsMobile } from "@/hooks/use-mobile";
import { getOSImage, getOSName } from "@/utils";
import { formatBytes } from "@/utils/unitHelper";
import { useTheme } from "@/contexts/ThemeContext";
import { type PingHistoryPoint, type PingStats, usePingStats } from "@/hooks/usePingStats";

import Flag from "./Flag";
import PriceTags from "./PriceTags";
import AdaptiveChart from "./AdaptiveChart";
import MiniPingChartFloat from "./MiniPingChartFloat";
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

function getTrafficPercentage(totalUp: number, totalDown: number, limit: number, type: "max" | "min" | "sum" | "up" | "down") {
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

function getTrafficUsed(totalUp: number, totalDown: number, type: "max" | "min" | "sum" | "up" | "down") {
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

function formatTrafficPercentage(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  if (value >= 100) return `${value.toFixed(1)}%`;
  if (value >= 10) return `${value.toFixed(1)}%`;
  if (value >= 1) return `${value.toFixed(2)}%`;
  if (value >= 0.01) return `${value.toFixed(3)}%`;
  return "<0.01%";
}

type QualityTone = "good" | "warn" | "bad";

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
}: {
  label: string;
  value: string;
  points: PingHistoryPoint[];
  metric: "latency" | "loss";
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/45 bg-background/45 px-2 py-1.5">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] leading-none">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 font-mono font-semibold text-foreground/80">{value}</span>
      </div>
      <div
        className="grid h-5 gap-0.5"
        style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))` }}
      >
        {points.map((point, index) => {
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
              className={`min-w-0 rounded-[2px] ${blockClassName}`}
              title={`${formatHistoryTime(point.time)} ${titleValue}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function PingQualityBars({ pingStats, t }: { pingStats: PingStats; t: TFunction }) {
  if (!pingStats.hasData) {
    return (
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">{t("nodeCard.pingStats")}</span>
        <span className="text-xs text-muted-foreground/70 italic">{t("nodeCard.noPingData")}</span>
      </div>
    );
  }

  const historyPoints = pingStats.history.length > 0
    ? pingStats.history
    : [{ time: new Date().toISOString(), latency: null, loss: null }];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{t("nodeCard.pingStats")}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {pingStats.avgVolatility.toFixed(1)} {t("chart.volatility")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PingHistoryStrip
          label={t("nodeCard.latency", { defaultValue: "Latency" })}
          value={`${Math.round(pingStats.avgLatency)} ms`}
          points={historyPoints}
          metric="latency"
        />
        <PingHistoryStrip
          label={t("chart.lossRate", { defaultValue: "Loss" })}
          value={`${pingStats.avgLoss.toFixed(1)}%`}
          points={historyPoints}
          metric="loss"
        />
      </div>
    </div>
  );
}

// --- Components ---

interface NodeProps {
  basic: NodeBasicInfo;
  live: Record | undefined;
  online: boolean;
}

const Node = ({ basic, live, online }: NodeProps) => {
  const [t] = useTranslation();
  const isMobile = useIsMobile();
  const { themeConfig } = useTheme();
  const pingStats = usePingStats(basic.uuid, 24);

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
    classic: "w-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 overflow-hidden group border",
    modern: "w-full transition-all duration-200 hover:shadow-lg overflow-hidden group border-none bg-gradient-to-br from-card to-card/50 shadow-sm",
    minimal: "w-full transition-all duration-200 hover:shadow-md overflow-hidden group bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border border-border/50",
    detailed: "w-full transition-all duration-200 hover:shadow-xl overflow-hidden group border-2 shadow-md hover:border-primary/30",
  };

  const headerStyles = {
    classic: "pb-2 pt-4 px-4 space-y-0",
    modern: "pb-3 pt-3 px-4 space-y-0 bg-primary/5 border-b border-primary/10",
    minimal: "pb-2 pt-4 px-4 space-y-0",
    detailed: "pb-3 pt-5 px-5 space-y-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-b-2",
  };

  const contentStyles = {
    classic: "p-4 pt-4",
    modern: "p-4 pt-4 bg-gradient-to-b from-background/50 to-transparent",
    minimal: "p-4 pt-3",
    detailed: "p-5 pt-4 bg-gradient-to-b from-background to-muted/10",
  };

  const footerStyles = {
    classic: "pb-3 pt-0 px-4 flex justify-between items-center",
    modern: "pb-3 pt-0 px-4 flex justify-between items-center bg-muted/20 border-t",
    minimal: "pb-3 pt-0 px-4 flex justify-between items-center",
    detailed: "pb-4 pt-0 px-5 flex justify-between items-center bg-muted/30 border-t-2",
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
                <Link href={`/instance/${basic.uuid}`} className="group-hover:text-primary transition-colors overflow-hidden flex-1">
                  <h3 className={`font-bold truncate pr-2 tracking-tight ${
                    themeConfig.cardLayout === 'detailed' ? 'text-lg' : 'text-base'
                  }`}>{basic.name}</h3>
                </Link>
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
          />
          <AdaptiveChart
            value={memoryUsagePercent}
            label="RAM"
            subLabel={formatBytes(liveData.ram.used)}
          />
          <AdaptiveChart
            value={diskUsagePercent}
            label="Disk"
            subLabel={formatBytes(liveData.disk.used)}
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
                   className="h-full bg-primary/70 rounded-full"
                   style={{ width: `${Math.min(trafficPercentage, 100)}%` }}
                 />
               </div>
               <div className="mt-1 flex justify-end text-[10px] font-mono text-muted-foreground">
                 <span>{formatTrafficPercentage(trafficPercentage)}</span>
               </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Footer: Price & Extra Info */}
      {(basic.price || basic.ipv4 || basic.ipv6) && (
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

export const NodeGrid = ({ nodes, liveData }: NodeGridProps) => {
  // Ensure liveData is valid
  const onlineNodes = liveData && liveData.online ? liveData.online : [];

  // Sort nodes: Online first, then by weight
  const sortedNodes = [...nodes].sort((a, b) => {
    const aOnline = onlineNodes.includes(a.uuid);
    const bOnline = onlineNodes.includes(b.uuid);

    // If one is online and the other is offline, online comes first
    if (aOnline !== bOnline) {
      return aOnline ? -1 : 1;
    }

    // Otherwise sort by weight (ascending - though typical logic is often descending for weight, keeping original logic here: a.weight - b.weight)
    return a.weight - b.weight;
  });

  return (
    <div
      className="grid gap-6 py-4 box-border w-full"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      }}
    >
      {sortedNodes.map((node) => {
        const isOnline = onlineNodes.includes(node.uuid);
        const nodeData =
          liveData && liveData.data ? liveData.data[node.uuid] : undefined;

        return (
          <Node
            key={node.uuid}
            basic={node}
            live={nodeData}
            online={isOnline}
          />
        );
      })}
    </div>
  );
};
