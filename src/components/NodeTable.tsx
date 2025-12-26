import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "@/components/ui/badge";
import { Flex } from "@/components/ui/flex";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData, Record } from "../types/LiveData";
import { formatUptime } from "./Node";
import { formatBytes } from "@/utils/unitHelper";
import UsageBar from "./UsageBar";
import AdaptiveChart from "./AdaptiveChart";
import Flag from "./Flag";
import PriceTags from "./PriceTags";
import Tips from "./ui/tips";
import { DetailsGrid } from "./DetailsGrid";
import MiniPingChart from "./MiniPingChart";
import { getOSImage } from "@/utils";
import { cn } from "@/lib/utils";

interface NodeTableProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}

type SortField = 'name' | 'os' | 'status' | 'cpu' | 'ram' | 'disk' | 'price' | 'networkUp' | 'networkDown' | 'totalUp' | 'totalDown';
type SortOrder = 'asc' | 'desc' | 'default';

interface SortState {
  field: SortField | null;
  order: SortOrder;
}

const NodeTable: React.FC<NodeTableProps> = ({ nodes, liveData }) => {
  const [t] = useTranslation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortState, setSortState] = useState<SortState>({ field: null, order: 'default' });

  const toggleRowExpansion = (uuid: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uuid)) {
        newSet.delete(uuid);
      } else {
        newSet.add(uuid);
      }
      return newSet;
    });
  };

  const handleSort = (field: SortField) => {
    return (event: React.MouseEvent) => {
      event.preventDefault();
      
      setSortState((prev) => {
        if (prev.field === field) {
          const nextOrder: SortOrder = 
            prev.order === 'default' ? 'asc' : 
            prev.order === 'asc' ? 'desc' : 'default';
          return { field: nextOrder === 'default' ? null : field, order: nextOrder };
        } else {
          return { field, order: 'asc' };
        }
      });
    };
  };

  const getSortIcon = (field: SortField) => {
    if (sortState.field !== field) return <div className="w-[14px]" />; // Placeholder to prevent layout shift
    return sortState.order === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const onlineNodes = liveData && liveData.online ? liveData.online : [];

  const getNodeData = (uuid: string): Record => {
    const defaultLive = {
      cpu: { usage: 0 },
      ram: { used: 0 },
      disk: { used: 0 },
      network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
      uptime: 0,
    } as Record;

    return liveData && liveData.data
      ? liveData.data[uuid] || defaultLive
      : defaultLive;
  };

  const sortedNodes = [...nodes].sort((a, b) => {
    const aOnline = onlineNodes.includes(a.uuid);
    const bOnline = onlineNodes.includes(b.uuid);
    const aData = getNodeData(a.uuid);
    const bData = getNodeData(b.uuid);

    if (!sortState.field || sortState.order === 'default') {
      if (aOnline !== bOnline) {
        return aOnline ? -1 : 1;
      }
      return a.weight - b.weight;
    }

    let comparison = 0;
    switch (sortState.field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'os':
        comparison = a.os.localeCompare(b.os);
        break;
      case 'status':
        comparison = Number(bOnline) - Number(aOnline);
        break;
      case 'cpu':
        comparison = aData.cpu.usage - bData.cpu.usage;
        break;
      case 'ram':
        const aRamPercent = a.mem_total ? (aData.ram.used / a.mem_total) * 100 : 0;
        const bRamPercent = b.mem_total ? (bData.ram.used / b.mem_total) * 100 : 0;
        comparison = aRamPercent - bRamPercent;
        break;
      case 'disk':
        const aDiskPercent = a.disk_total ? (aData.disk.used / a.disk_total) * 100 : 0;
        const bDiskPercent = b.disk_total ? (bData.disk.used / b.disk_total) * 100 : 0;
        comparison = aDiskPercent - bDiskPercent;
        break;
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'networkUp':
        comparison = aData.network.up - bData.network.up;
        break;
      case 'networkDown':
        comparison = aData.network.down - bData.network.down;
        break;
      case 'totalUp':
        comparison = aData.network.totalUp - bData.network.totalUp;
        break;
      case 'totalDown':
        comparison = aData.network.totalDown - bData.network.totalDown;
        break;
      default:
        comparison = 0;
    }

    return sortState.order === 'desc' ? -comparison : comparison;
  });

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden mx-4">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[40px]"></TableHead>
            <TableHead
              className="w-[200px] cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleSort('name')}
              title={t("nodeCard.sortTooltip")}
            >
              <Flex align="center" gap="1">
                {t("nodeCard.name")}
                {getSortIcon('name')}
              </Flex>
            </TableHead>
            <TableHead
              className="w-[60px] cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleSort('os')}
              title={t("nodeCard.sortTooltip")}
            >
              <Flex align="center" gap="1">
                {t("nodeCard.os")}
                {getSortIcon('os')}
              </Flex>
            </TableHead>
            <TableHead
              className="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleSort('status')}
              title={t("nodeCard.sortTooltip")}
            >
              <Flex align="center" gap="1">
                {t("nodeCard.status")}
                {getSortIcon('status')}
              </Flex>
            </TableHead>
            <TableHead
              className="w-[120px] cursor-pointer hover:bg-muted/50 transition-colors text-center"
              onClick={handleSort('cpu')}
              title={t("nodeCard.sortTooltip")}
            >
              <Flex align="center" gap="1" justify="center">
                {t("nodeCard.cpu")}
                {getSortIcon('cpu')}
              </Flex>
            </TableHead>
            <TableHead
              className="w-[120px] cursor-pointer hover:bg-muted/50 transition-colors text-center"
              onClick={handleSort('ram')}
              title={t("nodeCard.sortTooltip")}
            >
              <Flex align="center" gap="1" justify="center">
                {t("nodeCard.ram")}
                {getSortIcon('ram')}
              </Flex>
            </TableHead>
            <TableHead
              className="w-[120px] cursor-pointer hover:bg-muted/50 transition-colors text-center"
              onClick={handleSort('disk')}
              title={t("nodeCard.sortTooltip")}
            >
              <Flex align="center" gap="1" justify="center">
                {t("nodeCard.disk")}
                {getSortIcon('disk')}
              </Flex>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleSort('price')}
              title={t("nodeCard.sortTooltip")}
            >
              <Flex align="center" gap="1">
                {t("nodeCard.price")}
                {getSortIcon('price')}
              </Flex>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
              onClick={handleSort('networkUp')}
              title={t("nodeCard.sortTooltip")}
            >
              <Flex align="center" gap="1" justify="end">
                {t("nodeCard.networkSpeed")}
                {getSortIcon('networkUp')}
              </Flex>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
              onClick={handleSort('totalUp')}
              title={t("nodeCard.sortTooltip")}
            >
              <Flex align="center" gap="1" justify="end">
                {t("nodeCard.totalTransfer")}
                {getSortIcon('totalUp')}
              </Flex>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedNodes.map((node) => {
            const isOnline = onlineNodes.includes(node.uuid);
            const nodeData = getNodeData(node.uuid);
            const isExpanded = expandedRows.has(node.uuid);

            const memoryUsagePercent = node.mem_total
              ? (nodeData.ram.used / node.mem_total) * 100
              : 0;
            const diskUsagePercent = node.disk_total
              ? (nodeData.disk.used / node.disk_total) * 100
              : 0;

            return (
              <React.Fragment key={node.uuid}>
                <TableRow
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    !isOnline && "opacity-60",
                    isExpanded && "bg-muted/50 border-b-0"
                  )}
                  onClick={() => toggleRowExpansion(node.uuid)}
                >
                  <TableCell className="py-3 pl-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-6 w-6 transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}
                      aria-label="Expand row"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="py-3">
                    <Flex align="center" gap="2">
                      <Flag flag={node.region} />
                      <Link
                        href={`/instance/${node.uuid}`}
                        className="hover:underline focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-sm truncate max-w-[150px]">
                            {node.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {isOnline ? formatUptime(nodeData.uptime, t) : 'Offline'}
                          </span>
                        </div>
                      </Link>
                    </Flex>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center">
                      <img src={getOSImage(node.os)} alt={node.os} className="w-5 h-5 opacity-80" />
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <Flex align="center" gap="2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal text-xs px-2 py-0.5 border h-6",
                          isOnline
                            ? "border-green-500/30 text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-500/20"
                            : "border-red-500/30 text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-500/20"
                        )}
                      >
                         <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", isOnline ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                        {isOnline ? t("nodeCard.online") : t("nodeCard.offline")}
                      </Badge>
                      {nodeData.message && (
                        <Tips color="#ef4444">{nodeData.message}</Tips>
                      )}
                    </Flex>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex justify-center">
                      <AdaptiveChart
                        value={nodeData.cpu.usage}
                        label={t("nodeCard.cpu")}
                        compact={true}
                      />
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex justify-center">
                      <AdaptiveChart
                        value={memoryUsagePercent}
                        label={t("nodeCard.ram")}
                        subLabel={`${formatBytes(nodeData.ram.used)} / ${formatBytes(node.mem_total)}`}
                        compact={true}
                      />
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex justify-center">
                      <AdaptiveChart
                        value={diskUsagePercent}
                        label={t("nodeCard.disk")}
                        subLabel={`${formatBytes(nodeData.disk.used)} / ${formatBytes(node.disk_total)}`}
                        compact={true}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <PriceTags
                      price={node.price}
                      billing_cycle={node.billing_cycle}
                      expired_at={node.expired_at}
                      currency={node.currency}
                      gap="1"
                      tags={node.tags || ""}
                    />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="font-mono text-xs tabular-nums space-y-0.5">
                      <div className="text-blue-600 dark:text-blue-400">
                        ↑ {formatBytes(nodeData.network.up)}/s
                      </div>
                      <div className="text-green-600 dark:text-green-400">
                        ↓ {formatBytes(nodeData.network.down)}/s
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="font-mono text-xs tabular-nums text-muted-foreground space-y-0.5">
                      <div>↑ {formatBytes(nodeData.network.totalUp)}</div>
                      <div>↓ {formatBytes(nodeData.network.totalDown)}</div>
                    </div>
                  </TableCell>
                </TableRow>

                {isExpanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={10} className="p-0">
                      <div className="px-4 py-6 md:px-8 md:py-8">
                        <ExpandedNodeDetails node={node} nodeData={nodeData} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

interface ExpandedNodeDetailsProps {
  node: NodeBasicInfo;
  nodeData: Record;
}

const ExpandedNodeDetails: React.FC<ExpandedNodeDetailsProps> = ({ node }) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-lg p-5 border border-border/60 shadow-sm hover:shadow-md transition-shadow min-w-0">
        <DetailsGrid uuid={node.uuid} />
      </div>
      <div className="bg-card rounded-lg p-5 border border-border/60 shadow-sm hover:shadow-md transition-shadow min-w-0">
        <MiniPingChart hours={24} uuid={node.uuid} />
      </div>
    </div>
  );
};

export default NodeTable;
