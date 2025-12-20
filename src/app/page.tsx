"use client";

import React, { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePathname } from "next/navigation";
import { Settings, AlertTriangle, Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import NodeDisplay from "@/components/NodeDisplay";
import { formatBytes } from "@/utils/unitHelper";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import Loading from "@/components/loading";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import InstancePage from "@/components/instance/InstancePage";

// Intelligent speed formatting function
const formatSpeed = (bytes: number): string => {
  if (bytes === 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  // Adaptive decimal places
  let decimals = 2;
  if (i >= 3) decimals = 1; // GB and above: 1 decimal
  if (i <= 1) decimals = 0; // B and KB: no decimals
  if (size >= 100) decimals = 0; // 100+ of any unit: no decimals

  return `${size.toFixed(decimals)} ${units[i]}`;
};

export default function Dashboard() {
  const [t] = useTranslation();
  const pathname = usePathname() || "/";
  const { live_data } = useLiveData();
  const { publicInfo } = usePublicInfo();
  
  // Sync document title with backend-set custom title
  useEffect(() => {
    if (publicInfo?.sitename) {
      document.title = publicInfo.sitename;
    }
  }, [publicInfo?.sitename]);
  
  // Client-side routing for SPA behavior with static export
  const parts = pathname.split("/").filter(Boolean);
  
  // Handle /instance/<uuid> routes
  if (parts[0] === "instance" && parts[1]) {
    const uuid = parts[1];
    return <InstancePage uuid={uuid} />;
  }
  
  //#region 节点数据
  const { nodeList, isLoading, error, refresh } = useNodeList();

  // Status cards visibility state
  const [statusCardsVisibility, setStatusCardsVisibility] = useLocalStorage(
    "statusCardsVisibility",
    {
      currentTime: true,
      currentOnline: true,
      regionOverview: true,
      trafficOverview: true,
      networkSpeed: true,
    }
  );

  // Status cards configuration
  const statusCards = [
    {
      key: "currentTime",
      title: t("current_time"),
      getValue: () => new Date().toLocaleTimeString(),
      visible: statusCardsVisibility.currentTime,
    },
    {
      key: "currentOnline",
      title: t("current_online"),
      getValue: () =>
        `${live_data?.data?.online.length ?? 0} / ${nodeList?.length ?? 0}`,
      visible: statusCardsVisibility.currentOnline,
    },
    {
      key: "regionOverview",
      title: t("region_overview"),
      getValue: () =>
        nodeList
          ? Object.entries(
              nodeList.reduce((acc, item) => {
                if (live_data?.data.online.includes(item.uuid)) {
                  acc[item.region] = (acc[item.region] || 0) + 1;
                }
                return acc;
              }, {} as Record<string, number>)
            ).length
          : 0,
      visible: statusCardsVisibility.regionOverview,
    },
    {
      key: "trafficOverview",
      title: t("traffic_overview"),
      getValue: () => {
        const data = live_data?.data?.data;
        const online = live_data?.data?.online;
        if (!data || !online) return "↑ 0B / ↓ 0B";
        const onlineSet = new Set(online);
        const values = Object.entries(data)
          .filter(([uuid]) => onlineSet.has(uuid))
          .map(([, node]) => node);
        const up = values.reduce(
          (acc, node) => acc + (node.network.totalUp || 0),
          0
        );
        const down = values.reduce(
          (acc, node) => acc + (node.network.totalDown || 0),
          0
        );
        return `↑ ${formatBytes(up)} / ↓ ${formatBytes(down)}`;
      },
      visible: statusCardsVisibility.trafficOverview,
    },
    {
      key: "networkSpeed",
      title: t("network_speed"),
      getValue: () => {
        const data = live_data?.data?.data;
        const online = live_data?.data?.online;
        if (!data || !online) return "↑ 0 B/s / ↓ 0 B/s";
        const onlineSet = new Set(online);
        const values = Object.entries(data)
          .filter(([uuid]) => onlineSet.has(uuid))
          .map(([, node]) => node);
        const up = values.reduce(
          (acc, node) => acc + (node.network.up || 0),
          0
        );
        const down = values.reduce(
          (acc, node) => acc + (node.network.down || 0),
          0
        );
        return `↑ ${formatSpeed(up)} / ↓ ${formatSpeed(down)}`;
      },
      visible: statusCardsVisibility.networkSpeed,
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [nodeList]);

  if (isLoading) {
    return <Loading />;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }
  //#endregion

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Callouts />
      
      <Card className="relative">
        <div className="absolute top-2 right-2 z-10">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px]">
              <div className="flex flex-col gap-3">
                <h4 className="font-medium leading-none">{t("status_settings")}</h4>
                <div className="flex flex-col gap-2">
                  {statusCards.map((card) => (
                    <StatusSettingSwitch
                      key={card.key}
                      label={card.title}
                      checked={card.visible}
                      onCheckedChange={(checked) =>
                        setStatusCardsVisibility({
                          ...statusCardsVisibility,
                          [card.key]: checked,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <CardContent className="pt-6">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
            }}
          >
            {statusCards
              .filter((card) => card.visible)
              .map((card) => (
                <TopCard
                  key={card.key}
                  title={card.title}
                  value={card.getValue()}
                />
              ))}
          </div>
        </CardContent>
      </Card>

      <Suspense fallback={<div className="p-4">Loading nodes...</div>}>
        <NodeDisplay
          nodes={nodeList ?? []}
          liveData={live_data?.data ?? { online: [], data: {} }}
        />
      </Suspense>
    </div>
  );
}

//#region Callouts
const Callouts = () => {
  const [t] = useTranslation();
  const { showCallout } = useLiveData();
  // Safe check for window availability for SSR/SSG
  const ishttps = typeof window !== 'undefined' ? window.location.protocol === "https:" : true;
  
  if (ishttps && !showCallout) return null;

  return (
    <div className="flex flex-col gap-2">
      {!ishttps && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("warn_https")}</AlertTitle>
          <AlertDescription>
             {t("warn_https_desc", "You are using an insecure connection.")}
          </AlertDescription>
        </Alert>
      )}
      {!showCallout && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("warn_websocket")}</AlertTitle>
          <AlertDescription>
             {t("warn_websocket_desc", "WebSocket connection failed.")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

type TopCardProps = {
  title: string;
  value: string | number;
  description?: string;
};

const TopCard: React.FC<TopCardProps> = ({ title, value, description }) => {
  return (
    <div className="flex flex-col gap-1 p-2">
      <label className="text-muted-foreground text-sm">{title}</label>
      <label className="font-medium text-lg">{value}</label>
      {description && (
        <span className="text-sm text-gray-500">
          {description}
        </span>
      )}
    </div>
  );
};

type StatusSettingSwitchProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

const StatusSettingSwitch: React.FC<StatusSettingSwitchProps> = ({
  label,
  checked,
  onCheckedChange,
}) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
};
