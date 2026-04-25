import { useEffect, useState } from 'react';
import { useRPC2Call } from '@/contexts/RPC2Context';

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
  value?: number;
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

export interface PingHistoryPoint {
  time: string;
  latency: number | null;
  loss: number | null;
}

export interface PingStats {
  avgLatency: number;
  avgLoss: number;
  avgVolatility: number;
  history: PingHistoryPoint[];
  hasData: boolean;
}

const HISTORY_BUCKET_COUNT = 28;

function createEmptyStats(): PingStats {
  return {
    avgLatency: 0,
    avgLoss: 0,
    avgVolatility: 0,
    history: [],
    hasData: false,
  };
}

function buildPingHistory(records: PingRecord[]): PingHistoryPoint[] {
  const sortedRecords = records
    .map((record) => ({
      ...record,
      timestamp: new Date(record.time).getTime(),
    }))
    .filter((record) => Number.isFinite(record.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp);

  if (sortedRecords.length === 0) {
    return [];
  }

  const firstTime = sortedRecords[0].timestamp;
  const lastTime = sortedRecords[sortedRecords.length - 1].timestamp;
  const bucketCount = Math.min(HISTORY_BUCKET_COUNT, sortedRecords.length);
  const bucketSize = Math.max(1, (lastTime - firstTime) / bucketCount);

  return Array.from({ length: bucketCount }, (_, index) => {
    const startTime = firstTime + bucketSize * index;
    const endTime = index === bucketCount - 1 ? lastTime + 1 : startTime + bucketSize;
    const bucketRecords = sortedRecords.filter(
      (record) => record.timestamp >= startTime && record.timestamp < endTime,
    );
    const validLatencyRecords = bucketRecords.filter((record) => record.value >= 0);
    const lostRecords = bucketRecords.length - validLatencyRecords.length;
    const latency =
      validLatencyRecords.length > 0
        ? validLatencyRecords.reduce((sum, record) => sum + record.value, 0) / validLatencyRecords.length
        : null;
    const loss = bucketRecords.length > 0 ? (lostRecords / bucketRecords.length) * 100 : null;

    return {
      time: new Date(startTime).toISOString(),
      latency,
      loss,
    };
  });
}

export function usePingStats(uuid: string, hours: number = 24): PingStats {
  const { call } = useRPC2Call();
  const [stats, setStats] = useState<PingStats>(() => createEmptyStats());

  useEffect(() => {
    if (!uuid) return;

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

        const result = await call<any, RpcResp>('common:getRecords', {
          uuid,
          type: 'ping',
          hours,
        });

        const records = result?.records || [];
        const tasks = result?.tasks || [];

        if (records.length === 0 || tasks.length === 0) {
          setStats(createEmptyStats());
          return;
        }

        const history = buildPingHistory(records);
        const latencyValues = tasks
          .map((task) => task.avg ?? task.latest ?? task.value ?? task.p50)
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
        const avgLatency = latencyValues.length > 0
          ? latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length
          : 0;

        // Calculate average loss from tasks
        const totalLoss = tasks.reduce((sum, task) => sum + (task.loss || 0), 0);
        const avgLoss = tasks.length > 0 ? totalLoss / tasks.length : 0;

        // Calculate volatility (p99/p50 ratio average)
        const volatilityValues = tasks
          .filter(task => task.p99_p50_ratio !== undefined && task.p99_p50_ratio > 0)
          .map(task => task.p99_p50_ratio!);

        const avgVolatility = volatilityValues.length > 0
          ? volatilityValues.reduce((sum, val) => sum + val, 0) / volatilityValues.length
          : 0;

        setStats({
          avgLatency,
          avgLoss,
          avgVolatility,
          history,
          hasData: true,
        });
      } catch (err) {
        setStats(createEmptyStats());
      }
    })();

    return () => controller.abort();
  }, [uuid, hours, call]);

  return stats;
}
