"use client";

import { useEffect, useState } from "react";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { formatBytes } from "@/utils/unitHelper";
import { useNodeList } from "@/contexts/NodeListContext";
import fillMissingTimePoints, { type RecordFormat } from "@/utils/RecordHelper";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import Loading from "@/components/loading";

type LoadChartProps = {
  uuid: string;
  data: RecordFormat[];
  intervalSec?: number;
};

const LoadChart = ({ uuid, data = [] }: LoadChartProps) => {
  const { t } = useTranslation();
  const { live_data: all_live_data } = useLiveData();
  const { nodeList } = useNodeList();
  const { publicInfo } = usePublicInfo();
  const max_record_preserve_time = publicInfo?.record_preserve_time || 0;
  const [hoursView, setHoursView] = useState<string>("real-time");
  const [remoteData, setRemoteData] = useState<RecordFormat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetViews = [
    { label: t("chart.hours", { count: 4 }), hours: 4 },
    { label: t("chart.days", { count: 1 }), hours: 24 },
    { label: t("chart.days", { count: 7 }), hours: 168 },
    { label: t("chart.days", { count: 30 }), hours: 720 },
  ];
  const avaliableView: { label: string; hours?: number }[] = [
    { label: t("common.real_time") },
  ];
  
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
      max_record_preserve_time > 4 &&
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

  useEffect(() => {
    if (avaliableView.length > 0) {
      setHoursView(avaliableView[0].label);
    }
  }, [max_record_preserve_time]);

  useEffect(() => {
    const selected = avaliableView.find((v) => v.label === hoursView);
    if (!uuid) return;
    if (!selected || !selected.hours) {
      setRemoteData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/records/load?uuid=${uuid}&hours=${selected.hours}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((resp) => {
        const records = resp.data?.records || [];
        const gpuDevices = resp.data?.gpu_devices || {};

        const mergedRecords = records.map((record: RecordFormat) => {
          const gpuDetailed = [];

          for (const deviceIndex in gpuDevices) {
            const device = gpuDevices[deviceIndex];
            const gpuRecord = device.records?.find(
              (gr: any) =>
                new Date(gr.time).getTime() === new Date(record.time).getTime()
            );

            if (gpuRecord) {
              gpuDetailed.push({
                usage: gpuRecord.utilization,
                memory: (gpuRecord.mem_used / gpuRecord.mem_total) * 100,
                temperature: gpuRecord.temperature,
                device_index: gpuRecord.device_index,
                device_name: gpuRecord.device_name,
                mem_total: gpuRecord.mem_total,
                mem_used: gpuRecord.mem_used,});
            }
          }

          return {
            ...record,
            gpu_detailed: gpuDetailed.length > 0 ? gpuDetailed : undefined,
          };
        });

        mergedRecords.sort(
          (a: RecordFormat, b: RecordFormat) =>
            new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        setRemoteData(mergedRecords);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Error");
        setLoading(false);
      });
  }, [hoursView, uuid]);

  const colors = ["#F38181", "#FCE38A", "#EAFFD0", "#95E1D3"];
  const primaryColor = colors[0];
  const secondaryColor = colors[1];
  const cn = "max-w-72 min-w-72 flex flex-col w-full h-full gap-4";
  const chartMargin = {
    top: 0,
    right: 16,
    bottom: 0,
    left: 16,
  };
  const live_data = all_live_data?.data?.data[uuid ?? ""];
  const timeFormatter = (value: any, index: number) => {
    if (index === 0 || index === chartData.length - 1) {
      if (
        presetViews[0].label === hoursView ||
        hoursView === "real-time" ||
        hoursView === t("common.real_time")
      ) {
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
  const node = nodeList?.find((n) => n.uuid === uuid);
  const lableFormatter = (value: any) => {
    const date = new Date(value);
    if (hoursView === t("common.real_time") || hoursView === "real-time") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    return date.toLocaleString([], {
      month: "2-digit",
      day: "2-digit",hour: "2-digit",
      minute: "2-digit",});
  };
  const percentageFormatter = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const ChartTitle = (text: string, rightText: React.ReactNode) => {
    return (
      <div className="flex justify-between items-start mb-2 h-[80px]">
        <div className="flex flex-col justify-center gap-1">
             <label className="text-xl font-bold">{text}</label>
        </div>
        <div className="flex items-center gap-2 h-full">
            <div className="text-sm text-muted-foreground text-right">{rightText}</div>
        </div>
      </div>
    );
  };

  const minute = 60;
  const hour = minute * 60;
  const MAX_REALTIME_POINTS = 30 * 5;
  const isRealtime =
    hoursView === t("common.real_time") || hoursView === "real-time";
  const realtimeData = Array.isArray(data)
    ? data.slice(-MAX_REALTIME_POINTS)
    : data;

  const chartData = isRealtime
    ? realtimeData
    : hoursView === presetViews[0].label
    ? fillMissingTimePoints(remoteData ?? [], minute, hour * 4, minute * 2)
    : (() => {
        const selectedHours =
          presetViews.find((v) => v.label === hoursView)?.hours ||
          avaliableView.find((v) => v.label === hoursView)?.hours ||
          24;
        const interval = selectedHours > 120 ? hour : minute * 15;
        const maxGap = interval * 2;
        return fillMissingTimePoints(
          remoteData ?? [],
          interval,
          hour * selectedHours,
          maxGap
        );
      })();

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-screen">
      <div className="w-full overflow-x-auto px-2">
        <div className="w-max mx-auto">
          <SegmentedControl value={hoursView} onValueChange={setHoursView}>
            {avaliableView.map((view) => (
              <SegmentedControlItem key={view.label}
                value={view.label}
                className="capitalize"
              >
                {view.label}
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
      <div
        className="gap-4 grid w-full justify-items-center mx-auto max-w-full"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(288px, 1fr))",
        }}
      >
        {/* CPU */}
        <Card className={cn}>
          <CardContent className="p-4">
          {ChartTitle(
            "CPU",
            live_data?.cpu?.usage ? `${live_data.cpu.usage.toFixed(2)}%` : "-"
          )}
          <ChartContainer
            config={{
              cpu: {
                label: "CPU",
                color: primaryColor,
              },
            }}
          >
            <AreaChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) =>
                  `${value}%`
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={percentageFormatter}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="cpu"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              /></AreaChart>
          </ChartContainer>
          </CardContent>
        </Card>
        {/* Ram */}
        <Card className={cn}>
          <CardContent className="p-4">
          {ChartTitle(
            "Ram",
            <div className="flex flex-col items-end gap-0 text-sm">
              <label>
                {live_data?.ram?.used
                  ? `${formatBytes(live_data.ram.used)} / ${formatBytes(
                      node?.mem_total || 0
                    )}`
                  : "-"}
              </label>
              <label>
                {live_data?.swap?.used
                  ? `${formatBytes(live_data.swap.used)} / ${formatBytes(
                      node?.swap_total || 0
                    )}`
                  : "-"}
              </label>
            </div>
          )}
          <ChartContainer
            config={{
              ram: {
                label: "Ram",
                color: primaryColor,
              },
              swap: {
                label: "Swap",
                color: secondaryColor,
              },
            }}
          >
            <AreaChart
              data={chartData.map((item) => ({
                time: item.time,
                ram: node?.mem_total && node.mem_total > 0 ? ((item.ram ?? 0) / node.mem_total) * 100 : 0,
                ram_raw: item.ram,
                swap: node?.swap_total && node.swap_total > 0 ? ((item.swap ?? 0) / node.swap_total) * 100 : 0,swap_raw: item.swap,client: item.client,
              }))}
              accessibilityLayer
              margin={chartMargin}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) =>
                  `${value}%`
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={(value, name, props) => {
                  const payload = props?.payload || {};
                  let rawValue = 0;
                  if (name === "ram") {
                    rawValue = payload.ram_raw ?? 0;
                  } else if (name === "swap") {
                    rawValue = payload.swap_raw ?? 0;
                  }
                  let percent = 0;
                  if (typeof value === "number") {
                    percent = value;
                  } else if (typeof value === "string") {
                    const parsed = parseFloat(value);
                    percent = isNaN(parsed) ? 0 : parsed;
                  } else if (Array.isArray(value)) {
                    percent =
                      typeof value[0] === "number"
                        ? value[0]
                        : parseFloat(value[0] || "0");
                  }
                  return `${formatBytes(rawValue)} (${percent.toFixed(0)}%)`;
                }}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="ram"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
              <Area
                dataKey="swap"
                animationDuration={0}
                stroke={secondaryColor}
                fill={secondaryColor}
                opacity={0.8}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
          </CardContent>
        </Card>
        {/* Disk */}
        <Card className={cn}>
          <CardContent className="p-4">
          {ChartTitle(
            "Disk",
            live_data?.disk?.used
              ? `${formatBytes(live_data.disk.used)} / ${formatBytes(
                  node?.disk_total || 0
                )}`
              : "-"
          )}
          <ChartContainer
            config={{
              disk: {
                label: "Disk",
                color: primaryColor,
              },
            }}
          >
            <AreaChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, node?.disk_total && node.disk_total > 0 ? node.disk_total : 100]}
                tickFormatter={(value) =>
                  `${formatBytes(value)}`
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={formatBytes}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="disk"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
          </CardContent>
        </Card>
        {/* Network */}
        <Card className={cn}>
          <CardContent className="p-4">
          {ChartTitle(
            t("nodeCard.networkSpeed"),
            <div className="flex flex-col items-end gap-0 text-sm">
              <span>
                ↑ {formatBytes(live_data?.network.up || 0)}
                /s
              </span>
              <span>
                ↓ {formatBytes(live_data?.network.down || 0)}
                /s
              </span>
            </div>
          )}
          <ChartContainer
            config={{
              net_in: {
                label: t("chart.network_down"),
                color: primaryColor,
              },
              net_out: {
                label: t("chart.network_up"),
                color: colors[3],
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  `${formatBytes(value)}`
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={formatBytes}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="net_in"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
              <Line
                dataKey="net_out"
                animationDuration={0}
                stroke={colors[3]}
                fill={colors[3]}
                opacity={0.8}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
          </CardContent>
        </Card>
        {/* Connections */}
        <Card className={cn}>
          <CardContent className="p-4">
          {ChartTitle(
            t("chart.connections"),
            <div className="flex flex-col items-end gap-0 text-sm">
              <span>TCP: {live_data?.connections.tcp}</span>
              <span>UDP: {live_data?.connections.udp}</span>
            </div>
          )}
          <ChartContainer
            config={{
              connections: {
                label: "TCP",
                color: primaryColor,
              },
              connections_udp: {
                label: "UDP",
                color: colors[3],
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  `${value}`
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="connections"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
              <Line
                dataKey="connections_udp"
                animationDuration={0}
                stroke={colors[3]}
                fill={colors[3]}
                opacity={0.8}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
          </CardContent>
        </Card>
        {/* Process */}
        <Card className={cn}>
          <CardContent className="p-4">
          {ChartTitle(t("chart.process"), live_data?.process)}
          <ChartContainer
            config={{
              process: {
                label: t("chart.process"),
                color: primaryColor,
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) =>
                  `${value}`
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="process"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
          </CardContent>
        </Card>
        {/* GPU Charts */}
        {live_data?.gpu &&
          live_data.gpu.count > 0 &&
          live_data.gpu.detailed_info?.map((gpu, index) => (
            <Card key={`gpu-${index}`} className={cn}>
              <CardContent className="p-4">
              <div className="flex flex-col gap-2 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <label className="text-xl font-bold">{`GPU ${index + 1}`}</label>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold">{gpu.name}</span>
                    <span className="text-xs text-muted-foreground">
                        {formatBytes(gpu.memory_total)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="text-center">
                    <div className="font-medium">{t("chart.usage")}</div>
                    <div className="text-lg font-bold text-foreground">
                      {gpu.utilization}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{t("chart.gpu_memory")}</div>
                    <div className="text-lg font-bold text-foreground">
                      {((gpu.memory_used / gpu.memory_total) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">
                      {t("nodeCard.temperature")}
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {gpu.temperature}°C
                    </div>
                  </div>
                </div>
              </div>
              <ChartContainer
                config={{
                  gpu_usage: {
                    label: "GPU",
                    color: primaryColor,
                  },
                  gpu_memory: {
                    label: t("chart.gpu_memory"),
                    color: secondaryColor,
                  },gpu_temp: {
                    label: t("nodeCard.temperature"),
                    color: colors[2],
                  },
                }}
              >
                <AreaChart
                  data={chartData.map((item) => ({
                    time: item.time,
                    gpu_usage:
                      item.gpu_detailed?.[index]?.usage ?? item.gpu_usage ?? 0,
                    gpu_memory:
                      item.gpu_detailed?.[index]?.memory ??
                      item.gpu_memory ??
                      0,
                    gpu_memory_raw:
                      item.gpu_detailed?.[index]?.mem_used ??
                      (gpu.memory_total *
                        (item.gpu_detailed?.[index]?.memory || 0)) /
                        100,
                    gpu_temp: item.gpu_detailed?.[index]?.temperature ?? 0,
                    client: item.client,
                  }))}
                  accessibilityLayer
                  margin={chartMargin}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    tickFormatter={timeFormatter}
                    interval={0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                    orientation="left"
                    type="number"
                    tick={{ dx: -10 }}
                    mirror={true}
                  />
                  <ChartTooltip
                    cursor={false}
                    formatter={(value, name, props) => {
                      if (name === "gpu_temp") {
                        return `${value}°C`;
                      }
                      if (name === "gpu_usage") {
                        return `${Number(value).toFixed(1)}%`;
                      }
                      if (name === "gpu_memory") {
                        const percentage = Number(value).toFixed(1);
                        const rawValue = props.payload?.gpu_memory_raw || 0;
                        return `${formatBytes(rawValue)}(${percentage}%)`;
                      }
                      return `${Number(value).toFixed(1)}`;
                    }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={lableFormatter}
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    dataKey="gpu_usage"
                    animationDuration={0}
                    stroke={primaryColor}
                    fill={primaryColor}
                    opacity={0.8}
                    dot={false}
                  />
                  <Area
                    dataKey="gpu_memory"
                    animationDuration={0}
                    stroke={secondaryColor}
                    fill={secondaryColor}
                    opacity={0.8}
                    dot={false}
                  />
                  <Area
                    dataKey="gpu_temp"
                    animationDuration={0}
                    stroke={colors[2]}
                    fill={colors[2]}
                    opacity={0.6}
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
};

export default LoadChart;
