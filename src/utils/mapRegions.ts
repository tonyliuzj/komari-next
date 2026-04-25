import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import { resolveFlagCode } from "@/utils/flag";
import { emojiToRegionMap } from "@/utils/regionHelper";

type RegionStatus = "online" | "offline" | "partial";

type RegionMeta = {
  key: string;
  label: string;
  mapName: string;
  flagCode: string;
};

const regionMetaOverridesByFlagCode: Record<
  string,
  Partial<Pick<RegionMeta, "label" | "mapName">>
> = {
  US: { label: "United States", mapName: "United States of America" },
  MO: { label: "Macau", mapName: "Macao" },
  HK: { label: "Hong Kong", mapName: "Hong Kong" },
};

const englishRegionDisplayNames =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export interface MapRegionSummary {
  emoji: string;
  key: string;
  label: string;
  mapName: string;
  flagCode: string;
  total: number;
  online: number;
  offline: number;
  status: RegionStatus;
  nodes: NodeBasicInfo[];
}

export interface MapViewSummary {
  regions: MapRegionSummary[];
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  unmappedNodes: NodeBasicInfo[];
}

function getRegionStatus(online: number, offline: number): RegionStatus {
  if (online === 0) {
    return "offline";
  }

  if (offline === 0) {
    return "online";
  }

  return "partial";
}

function resolveRegionMetaFromFlagCode(flagCode: string): RegionMeta | null {
  if (flagCode === "UN") {
    return null;
  }

  const displayName = englishRegionDisplayNames?.of(flagCode)?.trim();
  if (!displayName) {
    return null;
  }

  const overrides = regionMetaOverridesByFlagCode[flagCode];

  return {
    key: flagCode,
    label: overrides?.label ?? displayName,
    mapName: overrides?.mapName ?? displayName,
    flagCode,
  };
}

function resolveRegionMeta(region: string): RegionMeta | null {
  const flagCode = resolveFlagCode(region);
  const standardizedMeta = resolveRegionMetaFromFlagCode(flagCode);
  if (standardizedMeta) {
    return standardizedMeta;
  }

  const regionInfo = emojiToRegionMap[region];
  if (!regionInfo) {
    return null;
  }

  return {
    key: flagCode,
    label: regionInfo.en,
    mapName: regionInfo.en,
    flagCode,
  };
}

export function buildMapViewSummary(nodes: NodeBasicInfo[], liveData: LiveData): MapViewSummary {
  const onlineSet = new Set(liveData?.online ?? []);
  const regionMap = new Map<string, MapRegionSummary>();
  const unmappedNodes: NodeBasicInfo[] = [];

  for (const node of nodes) {
    const regionMeta = resolveRegionMeta(node.region);

    if (!regionMeta) {
      unmappedNodes.push(node);
      continue;
    }

    const existing = regionMap.get(regionMeta.key);

    if (existing) {
      existing.nodes.push(node);
      existing.total += 1;
      if (onlineSet.has(node.uuid)) {
        existing.online += 1;
      } else {
        existing.offline += 1;
      }
      existing.status = getRegionStatus(existing.online, existing.offline);
      continue;
    }

    regionMap.set(regionMeta.key, {
      emoji: node.region,
      key: regionMeta.key,
      label: regionMeta.label,
      mapName: regionMeta.mapName,
      flagCode: regionMeta.flagCode,
      total: 1,
      online: onlineSet.has(node.uuid) ? 1 : 0,
      offline: onlineSet.has(node.uuid) ? 0 : 1,
      status: onlineSet.has(node.uuid) ? "online" : "offline",
      nodes: [node],
    });
  }

  const regions = Array.from(regionMap.values()).sort((left, right) => {
    if (right.total !== left.total) {
      return right.total - left.total;
    }

    if (right.online !== left.online) {
      return right.online - left.online;
    }

    return left.label.localeCompare(right.label);
  });

  const onlineNodes = nodes.filter((node) => onlineSet.has(node.uuid)).length;
  const offlineNodes = nodes.length - onlineNodes;

  return {
    regions,
    totalNodes: nodes.length,
    onlineNodes,
    offlineNodes,
    unmappedNodes,
  };
}
