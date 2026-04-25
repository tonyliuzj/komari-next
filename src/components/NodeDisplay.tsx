import React, { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { Search, Grid3X3, Table2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useNodeViewMode } from "@/hooks/useNodeViewMode";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "../types/LiveData";
import { NodeGrid } from "./Node";
const NodeTable = React.lazy(() => import("./NodeTable"));
import { isRegionMatch } from "@/utils/regionHelper";
import "./NodeDisplay.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface NodeDisplayProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}

const NodeDisplay: React.FC<NodeDisplayProps> = ({ nodes, liveData }) => {
  const [t] = useTranslation();
  const [viewMode, setViewMode] = useNodeViewMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useLocalStorage<string>(
    "nodeSelectedGroup",
    "all"
  );
  const searchRef = useRef<HTMLInputElement>(null);

  // 获取所有的分组
  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    nodes.forEach((node) => {
      if (node.group && node.group.trim()) {
        groupSet.add(node.group);
      }
    });
    return Array.from(groupSet).sort();
  }, [nodes]);

  // 判断是否显示分组选择器
  const showGroupSelector = groups.length >= 1;

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 按 "/" 键聚焦搜索框
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      // 按 Escape 键清空搜索
      if (e.key === "Escape" && searchTerm) {
        setSearchTerm("");
        searchRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm]);

  // 过滤节点
  const filteredNodes = useMemo(() => {
    let result = nodes;

    // 先按分组过滤
    if (selectedGroup !== "all") {
      result = result.filter((node) => node.group === selectedGroup);
    }

    // 再按搜索条件过滤
    if (!searchTerm.trim()) return result;

    const term = searchTerm.toLowerCase().trim();
    return result.filter((node) => {
      // 基本信息搜索
      const basicMatch =
        node.name.toLowerCase().includes(term) ||
        node.os.toLowerCase().includes(term) ||
        node.arch.toLowerCase().includes(term);

      // 地区搜索（支持emoji和地区名称）
      const regionMatch = isRegionMatch(node.region, term);

      // 价格搜索（如果输入数字）
      const priceMatch =
        !isNaN(Number(term)) && node.price.toString().includes(term);

      // 状态搜索
      const isOnline = liveData?.online?.includes(node.uuid) || false;
      const statusMatch =
        ((term === "online" || term === "在线") && isOnline) ||
        ((term === "offline" || term === "离线") && !isOnline);

      return basicMatch || regionMatch || priceMatch || statusMatch;
    });
  }, [nodes, searchTerm, liveData, selectedGroup]);

  return (
    <div className="w-full space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Search Box */}
        <div className="relative flex-1 max-w-lg group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            ref={searchRef}
            placeholder={t("search.placeholder", {
              defaultValue: "Search nodes... (Press '/' to focus)",
            })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-11 bg-card border-none shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
              onClick={() => {
                setSearchTerm("");
                searchRef.current?.focus();
              }}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>

        {/* View Mode & Group Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border shadow-sm">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-8 gap-2 px-3", viewMode === "grid" && "bg-card shadow-sm")}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("nodeDisplay.grid", { defaultValue: "Grid" })}
              </span>
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-8 gap-2 px-3", viewMode === "table" && "bg-card shadow-sm")}
              onClick={() => setViewMode("table")}
            >
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("nodeDisplay.table", { defaultValue: "Table" })}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Group Selector & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {showGroupSelector && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Tabs value={selectedGroup} onValueChange={setSelectedGroup} className="w-auto">
              <TabsList className="h-10 bg-muted/50 p-1 border">
                <TabsTrigger value="all" className="px-4">
                  {t("common.all", { defaultValue: "All" })}
                </TabsTrigger>
                {groups.map((group) => (
                  <TabsTrigger key={group} value={group} className="px-4">
                    {group}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Results Stats */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          {searchTerm.trim() ? (
            <span className="text-sm font-medium text-muted-foreground">
              {t("search.results", {
                count: filteredNodes.length,
                total:
                  selectedGroup === "all"
                    ? nodes.length
                    : nodes.filter((n) => n.group === selectedGroup).length,
                defaultValue: `Found ${filteredNodes.length} nodes`,
              })}
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              {selectedGroup === "all"
                ? t("nodeCard.totalNodes", {
                    total: nodes.length,
                    online: liveData?.online?.length || 0,
                    defaultValue: `${liveData?.online?.length || 0} Online / ${nodes.length} Total`,
                  })
                : t("nodeCard.groupNodes", {
                    group: selectedGroup,
                    total: filteredNodes.length,
                    online: filteredNodes.filter((n) =>
                      liveData?.online?.includes(n.uuid)
                    ).length,
                    defaultValue: `${filteredNodes.filter((n) => liveData?.online?.includes(n.uuid)).length} Online in ${selectedGroup}`,
                  })}
            </span>
          )}
        </div>
      </div>

      {/* Node Display Area */}
      {filteredNodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-muted/20 rounded-lg border border-dashed">
          <span className="text-lg text-muted-foreground mb-2">
            {searchTerm.trim()
              ? t("search.no_results", { defaultValue: "No matching nodes found" })
              : t("nodes.empty", { defaultValue: "No node data" })}
          </span>
          {searchTerm.trim() && (
            <span className="text-sm text-muted-foreground">
              {t("search.try_different", {
                defaultValue: "Try different keywords",
              })}
            </span>
          )}
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <NodeGrid nodes={filteredNodes} liveData={liveData} />
          ) : (
            <Suspense
              fallback={<div className="p-4 text-center">Loading table...</div>}
            >
              <NodeTable nodes={filteredNodes} liveData={liveData} />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
};

export default NodeDisplay;
