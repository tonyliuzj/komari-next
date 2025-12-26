import { useTranslation } from "react-i18next";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { formatUptime } from "./Node";
import { formatBytes } from "@/utils/unitHelper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DetailsGridProps = {
  uuid: string;
  gap?: string;
  box?: boolean;
  align?: "start" | "center" | "end";
};

const StatCard = ({ title, value, subValue, className }: { title: string, value: React.ReactNode, subValue?: React.ReactNode, className?: string }) => (
  <Card className={`shadow-sm ${className}`}>
    <CardHeader className="p-4 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <div className="text-lg font-bold break-all">{value}</div>
      {subValue && <div className="text-xs text-muted-foreground break-all">{subValue}</div>}
    </CardContent>
  </Card>
);

export const DetailsGrid = ({ uuid, gap, box, align }: DetailsGridProps) => {
  const { t } = useTranslation();
  const { nodeList } = useNodeList();
  const { live_data } = useLiveData();
  const node = nodeList?.find((n) => n.uuid === uuid);
  const data = live_data?.data.data[uuid ?? ""];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-${gap ?? "4"} w-full`}>
      {/* CPU */}
      <StatCard
        title="CPU"
        value={`${node?.cpu_name || 'Unknown'}`}
        subValue={`${node?.cpu_cores} Cores`}
        className="col-span-2 md:col-span-3 lg:col-span-2"
      />

      {/* Architecture */}
      <StatCard title={t("nodeCard.arch")} value={node?.arch || "Unknown"} />

      {/* Virtualization */}
      <StatCard title={t("nodeCard.virtualization")} value={node?.virtualization || "Unknown"} />

      {/* GPU */}
      <StatCard title="GPU" value={node?.gpu_name || "Unknown"} className="col-span-2 md:col-span-3 lg:col-span-2" />

      {/* OS */}
      <StatCard
        title={t("nodeCard.os")}
        value={node?.os || "Unknown"}
        subValue={`${t("nodeCard.kernelVersion")}: ${node?.kernel_version || "Unknown"}`}
      />

      {/* Network Speed */}
      <StatCard
        title={t("nodeCard.networkSpeed")}
        value={
          <div className="flex flex-col gap-1 text-base">
            <span className="text-green-500 whitespace-nowrap">↑ {formatBytes(data?.network.up || 0)}/s</span>
            <span className="text-blue-500 whitespace-nowrap">↓ {formatBytes(data?.network.down || 0)}/s</span>
          </div>
        }
      />

      {/* Total Traffic */}
      <StatCard
        title={t("nodeCard.totalTraffic")}
        value={
          <div className="flex flex-col gap-1 text-base">
            <span className="text-muted-foreground whitespace-nowrap">↑ {formatBytes(data?.network.totalUp || 0)}</span>
            <span className="text-muted-foreground whitespace-nowrap">↓ {formatBytes(data?.network.totalDown || 0)}</span>
          </div>
        }
      />

      {/* RAM */}
      <StatCard title={t("nodeCard.ram")} value={formatBytes(node?.mem_total || 0)} />

      {/* Swap */}
      <StatCard title={t("nodeCard.swap")} value={formatBytes(node?.swap_total || 0)} />

      {/* Disk */}
      <StatCard title={t("nodeCard.disk")} value={formatBytes(node?.disk_total || 0)} />

      {/* Uptime */}
      <StatCard
        title={t("nodeCard.uptime")}
        value={data?.uptime ? formatUptime(data?.uptime, t) : "-"}
      />

      {/* Last Updated */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("nodeCard.last_updated")}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-sm font-bold">
            {node?.updated_at
              ? new Date(data?.updated_at || node.updated_at).toLocaleString()
              : "-"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
