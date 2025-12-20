"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import type { Record } from "@/types/LiveData";
import Flag from "@/components/Flag";
import { Flex, SegmentedControl, Text } from "@radix-ui/themes";
import { useNodeList } from "@/contexts/NodeListContext";
import { liveDataToRecords } from "@/utils/RecordHelper";
import LoadChart from "./LoadChart";
import PingChart from "./PingChart";

// Import DetailsGrid as client-only to prevent hydration mismatch with i18n
const DetailsGrid = dynamic(
  () => import("@/components/DetailsGrid").then((mod) => ({ default: mod.DetailsGrid })),
  { ssr: false }
);

interface InstancePageProps {
  uuid: string;
}

export default function InstancePage({ uuid }: InstancePageProps) {
  const { t } = useTranslation();
  const { onRefresh } = useLiveData();
  const [recent, setRecent] = useState<Record[]>([]);
  const { nodeList } = useNodeList();
  const length = 30 * 5;
  const [chartView, setChartView] = useState<"load" | "ping">("load");
  
  // Find the node
  const node = nodeList?.find((n) => n.uuid === uuid);

  // Initial data loading
  useEffect(() => {
    if (!uuid) return;
    
    fetch(`/api/recent/${uuid}`)
      .then((res) => res.json())
      .then((data) => setRecent(data.data.slice(-length)))
      .catch((err) => console.error("Failed to fetch recent data:", err));
  }, [uuid, length]);

  // Dynamic data updates
  useEffect(() => {
    const unsubscribe = onRefresh((resp) => {
      if (!uuid) return;
      const data = resp.data.data[uuid];
      if (!data) return;

      setRecent((prev) => {
        const newRecord: Record = data;
        // Check if record with same timestamp already exists
        const exists = prev.some(
          (item) => item.updated_at === newRecord.updated_at
        );
        if (exists) {
          return prev;
        }

        // Append new record and maintain FIFO with length limit
        const updated = [...prev, newRecord].slice(-length);
        return updated;
      });
    });

    return unsubscribe;
  }, [onRefresh, uuid, length]);

  return (
    <Flex className="items-center" direction={"column"} gap="2">
      <div className="flex flex-col gap-1 md:p-4 p-3 border-0 rounded-md">
        <h1 className="flex items-center flex-wrap">
          <Flag flag={node?.region ?? ""} />
          <Text size="3" weight="bold" wrap="nowrap">
            {node?.name ?? uuid}
          </Text>
          <Text
            size="1"
            style={{
              marginLeft: "8px",
            }}
            className="text-accent-6"
            wrap="nowrap"
          >
            {node?.uuid}
          </Text>
        </h1>
        <DetailsGrid box align="center" uuid={uuid ?? ""} />
      </div><SegmentedControl.Root
        radius="full"
        value={chartView}
        onValueChange={(value) => setChartView(value as "load" | "ping")}
      >
        <SegmentedControl.Item value="load">
          {t("nodeCard.load")}
        </SegmentedControl.Item>
        <SegmentedControl.Item value="ping">
          {t("nodeCard.ping")}
        </SegmentedControl.Item>
      </SegmentedControl.Root>
      {/* Recharts */}
      {chartView === "load" ? (
        <LoadChart data={liveDataToRecords(uuid ?? "", recent)} />
      ) : (
        <PingChart uuid={uuid ?? ""} />
      )}
      <div className="grid w-full items-center justify-center mx-auto h-full gap-4 p-1 md:grid-cols-[repeat(auto-fit,minmax(620px,1fr))] grid-cols-[repeat(auto-fit,minmax(320px,1fr))]"></div>
    </Flex>
  );
}
