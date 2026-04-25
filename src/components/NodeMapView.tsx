"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { MapPinned } from "lucide-react";
import { feature } from "topojson-client";
import { useTranslation } from "react-i18next";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import worldCountries50m from "@/data/world-countries-50m.json";
import { buildMapViewSummary, type MapRegionSummary } from "@/utils/mapRegions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Flag from "@/components/Flag";

import "./NodeMapView.css";

interface NodeMapViewProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
  mapOnly?: boolean;
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;
type HoveredRegion = {
  regionKey: string;
  x: number;
  y: number;
  horizontal: "left" | "right";
  vertical: "above" | "below";
};

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 560;
const MAP_HORIZONTAL_PADDING = 28;
const MAP_TOP_PADDING = 42;
const MAP_BOTTOM_INSET = 42;
const HOVER_EDGE_THRESHOLD = 380;

function getStatusText(t: TranslateFn, status: "online" | "offline" | "partial") {
  switch (status) {
    case "online":
      return t("mapView.status.online", { defaultValue: "Online" });
    case "offline":
      return t("mapView.status.offline", { defaultValue: "Offline" });
    default:
      return t("mapView.status.partial", { defaultValue: "Partially online" });
  }
}

function getUnmappedRegionLabel(t: TranslateFn, region: string) {
  const normalizedRegion = region.trim();
  return normalizedRegion || t("mapView.regionUnknown", { defaultValue: "Not set" });
}

function getRegionStatusBadgeClass(status: "online" | "offline" | "partial") {
  switch (status) {
    case "online":
      return "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-300";
    case "offline":
      return "bg-rose-500/12 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300";
    default:
      return "bg-amber-500/14 text-amber-700 dark:bg-amber-500/18 dark:text-amber-300";
  }
}

export function NodeMapView({
  nodes,
  liveData,
  mapOnly = false,
}: NodeMapViewProps) {
  const { t } = useTranslation();
  const summary = useMemo(() => buildMapViewSummary(nodes, liveData), [nodes, liveData]);
  const [hoveredRegion, setHoveredRegion] = useState<HoveredRegion | null>(null);
  const hoverCardRef = useRef<HTMLDivElement | null>(null);
  const hoverFrameRef = useRef<number | null>(null);
  const pendingHoverPositionRef = useRef<Omit<HoveredRegion, "regionKey"> | null>(null);
  const hoverRegion =
    summary.regions.find((region) => region.key === hoveredRegion?.regionKey) ?? null;
  const hoverPosition = hoveredRegion
    ? pendingHoverPositionRef.current ?? hoveredRegion
    : null;

  const activeRegionsByMapName = useMemo(
    () => new Map(summary.regions.map((region) => [region.mapName, region])),
    [summary.regions],
  );

  const projectedMap = useMemo(() => {
    const countriesGeo = feature(
      worldCountries50m as never,
      (worldCountries50m as unknown as { objects: { countries: never } }).objects.countries,
    ) as unknown as { features: Array<{ id?: string; properties?: { name?: string } }> };

    const projection = geoNaturalEarth1().fitExtent(
      [
        [MAP_HORIZONTAL_PADDING, MAP_TOP_PADDING],
        [SVG_WIDTH - MAP_HORIZONTAL_PADDING, SVG_HEIGHT - MAP_BOTTOM_INSET],
      ],
      countriesGeo as never,
    );

    const pathGenerator = geoPath(projection);
    const spherePath = pathGenerator({ type: "Sphere" }) ?? "";
    const graticulePath = pathGenerator(geoGraticule10()) ?? "";

    const countries = countriesGeo.features
      .map((country) => {
        const name = country.properties?.name ?? String(country.id ?? "unknown");
        const pathData = pathGenerator(country as never) ?? "";
        const activeRegion = activeRegionsByMapName.get(name) ?? null;

        return {
          name,
          pathData,
          activeRegion,
        };
      })
      .filter((country) => country.pathData);

    return {
      spherePath,
      graticulePath,
      countries,
    };
  }, [activeRegionsByMapName]);

  const getHoverPosition = useCallback((event: PointerEvent<SVGPathElement>) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const x = event.clientX;
    const y = event.clientY;

    return {
      x,
      y,
      horizontal: x > viewportWidth - HOVER_EDGE_THRESHOLD ? "left" : "right",
      vertical: y > viewportHeight - HOVER_EDGE_THRESHOLD ? "above" : "below",
    } satisfies Omit<HoveredRegion, "regionKey">;
  }, []);

  const applyHoverPosition = useCallback((position: Omit<HoveredRegion, "regionKey">) => {
    const hoverCard = hoverCardRef.current;
    if (!hoverCard) {
      return;
    }

    hoverCard.style.setProperty("--node-map-hover-x", `${position.x}px`);
    hoverCard.style.setProperty("--node-map-hover-y", `${position.y}px`);
    hoverCard.dataset.horizontal = position.horizontal;
    hoverCard.dataset.vertical = position.vertical;
  }, []);

  const queueHoverPosition = useCallback(
    (position: Omit<HoveredRegion, "regionKey">) => {
      pendingHoverPositionRef.current = position;

      if (hoverFrameRef.current !== null) {
        return;
      }

      hoverFrameRef.current = window.requestAnimationFrame(() => {
        hoverFrameRef.current = null;
        const nextPosition = pendingHoverPositionRef.current;

        if (nextPosition) {
          applyHoverPosition(nextPosition);
        }
      });
    },
    [applyHoverPosition],
  );

  const updateHoveredRegion = useCallback(
    (event: PointerEvent<SVGPathElement>, region: MapRegionSummary) => {
      const position = getHoverPosition(event);

      setHoveredRegion({
        regionKey: region.key,
        ...position,
      });
      queueHoverPosition(position);
    },
    [getHoverPosition, queueHoverPosition],
  );

  const updateHoverPosition = useCallback(
    (event: PointerEvent<SVGPathElement>) => {
      queueHoverPosition(getHoverPosition(event));
    },
    [getHoverPosition, queueHoverPosition],
  );

  const clearHoveredRegion = useCallback(() => {
    setHoveredRegion(null);
    pendingHoverPositionRef.current = null;

    if (hoverFrameRef.current !== null) {
      window.cancelAnimationFrame(hoverFrameRef.current);
      hoverFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverFrameRef.current !== null) {
        window.cancelAnimationFrame(hoverFrameRef.current);
      }
    };
  }, []);

  if (!summary.totalNodes) {
    return (
      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/95 shadow-sm">
        {!mapOnly && (
          <CardHeader>
            <CardTitle>{t("mapView.title", { defaultValue: "Global Distribution" })}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="rounded-3xl border border-dashed border-border/70 bg-muted/40 px-6 py-12 text-center text-sm text-muted-foreground">
            {t("nodes.empty", { defaultValue: "No node data" })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={
        mapOnly
          ? "node-map-view overflow-visible rounded-none border-0 bg-transparent shadow-none"
          : "node-map-view overflow-hidden rounded-[28px] border-border/70 bg-card/95 shadow-sm"
      }
    >
      {!mapOnly && (
        <CardHeader className="space-y-4 border-b border-border/70 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/14 dark:text-sky-300">
                <MapPinned className="h-3.5 w-3.5" />
                {t("common.map", { defaultValue: "Map" })}
              </div>
              <CardTitle className="text-2xl tracking-tight">
                {t("mapView.title", { defaultValue: "Global Distribution" })}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("mapView.activeCountries", {
                  count: summary.regions.length,
                  defaultValue: "{{count}} active countries / regions",
                })}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="rounded-full bg-muted px-3 py-1 text-muted-foreground"
              >
                {t("mapView.servers", {
                  count: summary.totalNodes,
                  defaultValue: "{{count}} servers",
                })}
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full bg-emerald-500/12 px-3 py-1 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-300"
              >
                {t("mapView.online", {
                  count: summary.onlineNodes,
                  defaultValue: "{{count}} online",
                })}
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full bg-rose-500/12 px-3 py-1 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300"
              >
                {t("mapView.offline", {
                  count: summary.offlineNodes,
                  defaultValue: "{{count}} offline",
                })}
              </Badge>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className={mapOnly ? "p-0" : "p-5 lg:p-6"}>
        <div className={mapOnly ? "node-map-view__layout node-map-view__layout--map-only" : "node-map-view__layout"}>
          <div className="node-map-view__surface">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="node-map-view__svg"
              role="img"
              aria-label={t("mapView.ariaLabel", { defaultValue: "Global node distribution map" })}
            >
              <path d={projectedMap.spherePath} className="node-map-view__ocean" />
              <path d={projectedMap.graticulePath} className="node-map-view__graticule" />

              <g className="node-map-view__country-layer">
                {projectedMap.countries.map((country) => {
                  const region = country.activeRegion;
                  const isSelected = hoveredRegion?.regionKey === region?.key;
                  const ariaLabel = region
                    ? t("mapView.countrySummary", {
                        name: region.label,
                        total: region.total,
                        online: region.online,
                        offline: region.offline,
                        defaultValue:
                          "{{name}}: {{total}} nodes, {{online}} online, {{offline}} offline",
                      })
                    : country.name;

                  return (
                    <g key={country.name} className="node-map-view__country-group">
                      <path
                        d={country.pathData}
                        data-country-code={region?.flagCode}
                        data-country-name={country.name}
                        className={`node-map-view__country${region ? ` is-active status-${region.status}` : ""}${isSelected ? " is-selected" : ""}`}
                        aria-label={ariaLabel}
                        onPointerEnter={region ? (event) => updateHoveredRegion(event, region) : undefined}
                        onPointerMove={region ? updateHoverPosition : undefined}
                        onPointerLeave={region ? clearHoveredRegion : undefined}
                      />
                    </g>
                  );
                })}
              </g>
            </svg>

            <div className="node-map-view__legend node-map-view__legend--inset">
              <div className="node-map-view__legend-card node-map-view__legend-card--status">
                <div className="node-map-view__legend-items node-map-view__legend-items--stacked">
                  <span className="node-map-view__legend-item">
                    <span className="node-map-view__legend-dot status-online" />
                    {t("mapView.legend.online", { defaultValue: "Fully online" })}
                  </span>
                  <span className="node-map-view__legend-item">
                    <span className="node-map-view__legend-dot status-partial" />
                    {t("mapView.legend.partial", { defaultValue: "Partially online" })}
                  </span>
                  <span className="node-map-view__legend-item">
                    <span className="node-map-view__legend-dot status-offline" />
                    {t("mapView.legend.offline", { defaultValue: "Fully offline" })}
                  </span>
                </div>
              </div>

              {summary.unmappedNodes.length > 0 && (
                <div className="node-map-view__legend-card node-map-view__legend-card--stacked">
                  <div className="node-map-view__legend-unmapped-header">
                    <span className="text-xs font-semibold text-foreground">
                      {t("mapView.unmappedRegions", { defaultValue: "Unmapped Regions" })}
                    </span>
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-amber-500/12 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/18 dark:text-amber-300"
                    >
                      {t("mapView.unmappedCount", {
                        count: summary.unmappedNodes.length,
                        defaultValue: "Total {{count}} items",
                      })}
                    </Badge>
                  </div>
                  <div className="node-map-view__legend-unmapped-list">
                    {summary.unmappedNodes.map((node) => (
                      <div key={`${node.uuid}-unmapped`} className="node-map-view__legend-unmapped-item">
                        <span className="node-map-view__legend-unmapped-region">
                          {getUnmappedRegionLabel(t, node.region)}
                        </span>
                        <span className="node-map-view__legend-unmapped-node">{node.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {hoverRegion && hoverPosition && (
              <div
                ref={hoverCardRef}
                className="node-map-view__hover-card"
                data-horizontal={hoverPosition.horizontal}
                data-vertical={hoverPosition.vertical}
                style={{
                  "--node-map-hover-x": `${hoverPosition.x}px`,
                  "--node-map-hover-y": `${hoverPosition.y}px`,
                } as CSSProperties}
              >
                <div className="node-map-view__detail-header node-map-view__hover-header">
                  <div className="node-map-view__detail-heading">
                    <span className="node-map-view__detail-flag" aria-hidden="true">
                      <Flag flag={hoverRegion.emoji} />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {hoverRegion.flagCode}
                      </div>
                      <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">
                        {hoverRegion.label}
                      </h3>
                      <div className="node-map-view__hover-count-line">
                        <span className="node-map-view__hover-count-total">
                          {hoverRegion.total}
                          <span>{t("mapView.stats.nodes", { defaultValue: "Nodes" })}</span>
                        </span>
                        <span className="node-map-view__hover-status-counts">
                          <span className="node-map-view__hover-count node-map-view__hover-count--online">
                            {hoverRegion.online} {t("nodeCard.online", { defaultValue: "Online" })}
                          </span>
                          <span className="node-map-view__hover-count node-map-view__hover-count--offline">
                            {hoverRegion.offline} {t("nodeCard.offline", { defaultValue: "Offline" })}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className={`shrink-0 whitespace-nowrap rounded-full ${getRegionStatusBadgeClass(hoverRegion.status)}`}
                  >
                    {getStatusText(t, hoverRegion.status)}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
