"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flex, Card, Switch, Button } from "@radix-ui/themes";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import Loading from "@/components/loading";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { cutPeakValues, interpolateNullsLinear } from "@/utils/RecordHelper";
import Tips from "@/components/ui/tips";
import { Eye, EyeOff } from "lucide-react";
import { useRPC2Call } from "@/contexts/RPC2Context";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";

interface PingRecord {
  client: string;
  task_id: number;
  time: string;
  value: number;
}
interface TaskInfo {
  id: number;
  name: string;
  interval: number;
  loss: number;
  p99?: number;
  p50?: number;
  p99_p50_ratio?: number;
  min?: number;
  max?: number;
  avg?: number;
  latest?: number;
  total?: number;
  type?: string;
}

const colors = [
  "#F38181",
  "#347433",
  "#898AC4",
  "#03A6A1",
  "#7AD6F0",
  "#B388FF",
  "#FF8A65",
  "#FFD600",
];

const PingChart = ({ uuid }: { uuid: string }) => {
  const { t } = useTranslation();
  const { publicInfo } = usePublicInfo();
  const { call } = useRPC2Call();
  const max_record_preserve_time = publicInfo?.ping_record_preserve_time || 0;
  const presetViews = [
    { label: t("chart.hours", { count: 1 }), hours: 1 },
    { label: t("chart.hours", { count: 6 }), hours: 6 },
    { label: t("chart.hours", { count: 12 }), hours: 12 },
    { label: t("chart.days", { count: 1 }), hours: 24 },
  ];
  const avaliableView: { label: string; hours?: number }[] = [];
  if (
    typeof max_record_preserve_time === "number" &&
    max_record_preserve_time > 0
  ) {
    for (const v of presetViews) {
      if (max_record_preserve_time >= v.hours) {
        avaliableView.push({ label: v.label, hours: v.hours });
      }
    }
    const maxPreset = presetViews[presetViews.length - 1];
    if (max_record_preserve_time > maxPreset.hours) {
      const dynamicLabel =
        max_record_preserve_time % 24 === 0
          ? `${t("chart.days", {
              count: Math.floor(max_record_preserve_time / 24),
            })}`
          : `${t("chart.hours", { count: max_record_preserve_time })}`;
      avaliableView.push({
        label: dynamicLabel,
        hours: max_record_preserve_time,
      });
    } else if (
      max_record_preserve_time > 1 &&
      !presetViews.some((v) => v.hours === max_record_preserve_time)
    ) {
      const dynamicLabel =
        max_record_preserve_time % 24 === 0
          ? `${t("chart.days", {
              count: Math.floor(max_record_preserve_time / 24),
            })}`
          : `${t("chart.hours", { count: max_record_preserve_time })}`;
      avaliableView.push({
        label: dynamicLabel,
        hours: max_record_preserve_time,
      });
    }
  }

  const initialView =
    avaliableView.find((v) => v.hours === 1)?.label ||
    avaliableView[0]?.label ||
    "";
  const [view, setView] = useState<string>(initialView);
  const [hours, setHours] = useState<number>(
    avaliableView.find((v) => v.label === initialView)?.hours || 1
  );

  const [remoteData, setRemoteData] = useState<PingRecord[] | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cutPeak, setCutPeak] = useState(false);

  useEffect(() => {
    const selected = avaliableView.find((v) => v.label === view);
    if (selected && selected.hours !== undefined) {
      setHours(selected.hours);
    }
  }, [view, avaliableView]);

  useEffect(() => {
    if (!uuid) return;
    if (!hours) {
      setRemoteData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    (async () => {
      try {
        type RpcResp = {
          count: number;
          records: PingRecord[];
          tasks?: TaskInfo[];
          from?: string;
          to?: string;
        };
        const result = await call<any, RpcResp>("common:getRecords", {
          uuid,
          type: "ping",
          hours,});
        const records = result?.records || [];
        records.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        setRemoteData(records);
        setTasks(result?.tasks || []);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "Error");
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [hours, uuid]);

  const midData = useMemo(() => {
    const data = remoteData || [];
    if (!data.length) return [];

    const taskIntervals = tasks
      .map((t) => t.interval)
      .filter((v): v is number => typeof v === "number" && v > 0);
    const fallbackIntervalSec = taskIntervals.length
      ? Math.min(...taskIntervals)
      : 60;

    const toleranceMs = Math.min(
      6000,
      Math.max(800, Math.floor(fallbackIntervalSec * 1000 * 0.25))
    );
    const grouped: Record<number, any> = {};
    const anchors: number[] = [];
    for (const rec of data) {
      const ts = new Date(rec.time).getTime();
      let anchor: number | null = null;
      for (const a of anchors) {
        if (Math.abs(a - ts) <= toleranceMs) {
          anchor = a;
          break;
        }
      }
      const use = anchor ?? ts;
      if (!grouped[use]) {
        grouped[use] = { time: new Date(use).toISOString() };
        if (anchor === null) anchors.push(use);
      }
      grouped[use][rec.task_id] = rec.value < 0 ? null : rec.value;
    }
    const merged = Object.values(grouped).sort(
      (a: any, b: any) =>
        new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    const lastTs = new Date(
      (merged as any[])[(merged as any[]).length - 1].time
    ).getTime();
    const fromTs = lastTs - hours * 3600_000;
    let startIdx = 0;
    for (let i = 0; i < (merged as any[]).length; i++) {
      const ts = new Date((merged as any[])[i].time).getTime();
      if (ts >= fromTs) {
        startIdx = Math.max(0, i - 1);
        break;
      }
    }
    const clipped = (merged as any[]).slice(startIdx);
    return clipped;
  }, [remoteData, tasks, hours]);

  const chartData = useMemo(() => {
    let full = midData;
    if (cutPeak && tasks.length > 0) {
      const taskKeys = tasks.map((task) => String(task.id));
      full = cutPeakValues(midData, taskKeys);
    }
    if (tasks.length > 0 && full.length > 0) {
      const keys = tasks.map((t) => String(t.id));
      full = interpolateNullsLinear(full, keys, {
        maxGapMultiplier: 6,
        minCapMs: 2 * 60_000,
        maxCapMs: 30 * 60_000,
      });
    }
    return full;
  }, [remoteData, cutPeak, tasks, hours]);

  const timeFormatter = (value: any, index: number) => {
    if (!chartData.length) return "";
    if (index === 0 || index === chartData.length - 1) {
      if (hours < 24) {
        return new Date(value).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return new Date(value).toLocaleDateString([], {
        month: "2-digit",
        day: "2-digit",
      });
    }
    return "";
  };
  const lableFormatter = (value: any) => {
    const date = new Date(value);
    if (hours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    return date.toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const chartConfig = useMemo(() => {
    const config: Record<string, any> = {};
    tasks.forEach((task, idx) => {
      config[task.id] = {
        label: `${task.name}${
          typeof task.p99_p50_ratio === "number"
            ? ` (${t("chart.volatility")}: ${task.p99_p50_ratio.toFixed(2)})`
            : ""
        }`,
        color: colors[idx % colors.length],
      };
    });
    return config;
  }, [tasks]);

  const latestValues = useMemo(() => {
    if (!remoteData || !tasks.length) return [];
    const map = new Map<number, PingRecord>();

    for (const task of tasks) {
      for (let i = remoteData.length - 1; i >= 0; i--) {
        const rec = remoteData[i];
        if (rec.task_id === task.id && rec.value >= 0) {
          map.set(task.id, rec);
          break;
        }
      }
    }

    return tasks.map((task, idx) => ({
      ...task,
      value: map.get(task.id)?.value ?? null,
      time: map.get(task.id)?.time ?? null,
      color: colors[idx % colors.length],
    }));
  }, [remoteData, tasks]);

  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});
  const handleLegendClick = useCallback((e: any) => {
    const key = e.dataKey;
    setHiddenLines((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleAllLines = useCallback(() => {
    const allHidden = tasks.every((task) => hiddenLines[String(task.id)]);
    const newHiddenState: Record<string, boolean> = {};
    tasks.forEach((task) => {
      newHiddenState[String(task.id)] = !allHidden;
    });
    setHiddenLines(newHiddenState);
  }, [tasks, hiddenLines]);

  return (
    <Flex
      direction="column"
      align="center"
      gap="4"
      className="w-full max-w-screen"
    >
      <div className="w-full overflow-x-auto px-2">
        <div className="w-max mx-auto">
          <SegmentedControl
            value={view}
            onValueChange={(newView) => {
              setView(newView);const selected = avaliableView.find((v) => v.label === newView);
              if (selected && selected.hours !== undefined) {
                setHours(selected.hours);
              }
            }}>
            {avaliableView.map((v) => (
              <SegmentedControlItem
                key={v.label}
                value={v.label}
                className="capitalize"
              >
                {v.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", width: "100%" }}>
          <Loading />
        </div>
      )}
      {error && (
        <div style={{ color: "red", textAlign: "center", width: "100%" }}>
          {error}
        </div>
      )}
      {latestValues.length > 0 ? (
        <Card className="w-full max-w-full mb-2">
          <Tips className="absolute top-0 right-0 m-2">
            <label>{t("chart.loss_tips")}</label>
          </Tips>
          <div
            className="grid gap-2 mb-2 w-full"
            style={{
              gridTemplateColumns: `repeat(auto-fit, minmax(240px,1fr))`,
            }}
          >
            {latestValues.map((task) => (
              <div key={task.id} className="flex flex-row items-center rounded">
                <div
                  className="w-1 h-6 rounded-xs "
                  style={{ backgroundColor: task.color }}
                />
                <div className="flex items-start justify-center ml-1 flex-col">
                  <div className="flex items-center gap-1 -mb-1">
                    <label className="font-bold text-md">{task.name}</label>
                    <Tips
                      side="top"
                      trigger={
                        <DotsHorizontalIcon
                          className="cursor-pointer"
                          color="gray"
                        />
                      }
                    >
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {typeof task.min === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.min")}
                            </span>
                            <span className="font-mono">
                              {Math.round(task.min)} ms
                            </span>
                          </>
                        )}
                        {typeof task.max === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.max")}
                            </span>
                            <span className="font-mono">
                              {Math.round(task.max)} ms
                            </span>
                          </>
                        )}
                        {typeof task.avg === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.avg")}
                            </span>
                            <span className="font-mono">
                              {Math.round(task.avg)} ms
                            </span>
                          </>
                        )}
                        {typeof task.latest === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.latest")}
                            </span>
                            <span className="font-mono">
                              {Math.round(task.latest)} ms
                            </span>
                          </>
                        )}
                        {typeof task.p99_p50_ratio === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.volatility")}
                            </span>
                            <span className="font-mono">
                              {task.p99_p50_ratio.toFixed(2)}
                            </span>
                          </>
                        )}
                        {typeof task.p50 === "number" && (
                          <>
                            <span className="text-muted-foreground">p50</span>
                            <span className="font-mono">
                              {Math.round(task.p50)} ms
                            </span>
                          </>
                        )}
                        {typeof task.p99 === "number" && (
                          <>
                            <span className="text-muted-foreground">p99</span>
                            <span className="font-mono">
                              {Math.round(task.p99)} ms
                            </span>
                          </>
                        )}
                        {typeof task.loss === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.lossRate")}
                            </span>
                            <span className="font-mono">
                              {Number(task.loss).toFixed(1)}%
                            </span>
                          </>
                        )}{typeof task.interval === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.interval")}
                            </span>
                            <span className="font-mono">{task.interval}s</span>
                          </>
                        )}
                        {task.type && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.type")}
                            </span>
                            <span className="font-mono uppercase">
                              {task.type}
                            </span>
                          </>
                        )}{typeof task.total === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.total")}
                            </span>
                            <span className="font-mono">{task.total}</span>
                          </>
                        )}
                      </div>
                    </Tips>
                  </div>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <span>
                      {task.value !== null
                        ? `${Number(task.value).toFixed(0)} ms`
                        : "-"}
                    </span>
                    <span>
                      {`${Number(task.loss).toFixed(1)}%${t("chart.lossRate")}`}
                    </span>{typeof task.p99_p50_ratio === "number" && (
                      <span title="p99/p50">
                        {task.p99_p50_ratio.toFixed(1)}
                        {t("chart.volatility")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="w-full max-w-full text-center text-muted-foreground mb-2">
          {t("common.none")}
        </div>
      )}
      <Card className="w-full max-w-full">
        {chartData.length === 0 ? (
          <div className="w-full h-40 flex items-center justify-center text-muted-foreground">
            {t("common.none")}
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <LineChart
              data={chartData}
              accessibilityLayer
              margin={{ top: 0, right: 16, bottom: 0, left: 16 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval="preserveStartEnd"
                minTickGap={30}
                allowDuplicatedCategory={false}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                unit="ms"
                allowDecimals={false}
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={(v: any) => `${Math.round(v)} ms`}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <ChartLegend onClick={handleLegendClick} />
              {(() => {
                return tasks.map((task, idx) => {
                  const connect = false;
                  return (
                    <Line
                      key={task.id}
                      dataKey={String(task.id)}
                      name={task.name}
                      stroke={colors[idx % colors.length]}
                      dot={false}
                      isAnimationActive={false}
                      strokeWidth={2}
                      connectNulls={connect}
                      type={cutPeak ? "basis" : "linear"}
                      hide={!!hiddenLines[String(task.id)]}
                    />
                  );
                });
              })()}
            </LineChart>
          </ChartContainer>
        )}
        <div
          className="flex items-center justify-between gap-4"
          style={{ display: loading ? "none" : "flex" }}
        >
          <div className="flex items-center gap-2">
            <Switch
              id="cut-peak"
              checked={cutPeak}
              onCheckedChange={setCutPeak}
            />
            <label
              htmlFor="cut-peak"
              className="text-sm font-medium flex items-center gap-1 flex-row"
            >
              {t("chart.cutPeak")}
              <Tips>
                <span
                  dangerouslySetInnerHTML={{ __html: t("chart.cutPeak_tips") }}
                />
              </Tips>
            </label>
          </div>
          <Button
            variant="soft"
            size="2"
            onClick={toggleAllLines}
            className="flex items-center gap-2"
          >
            {tasks.every((task) => hiddenLines[String(task.id)]) ? (
              <>
                <Eye size={16} />
                {t("chart.showAll")}
              </>
            ) : (
              <>
                <EyeOff size={16} />
                {t("chart.hideAll")}
              </>
            )}
          </Button>
        </div>
      </Card>
    </Flex>
  );
};

export default PingChart;
