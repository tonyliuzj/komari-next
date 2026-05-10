import React from 'react';
import { NodeInfo } from '@/types/admin/NodeInfo';
import { LiveData } from '@/types/LiveData';
import { MetricBarLumina } from './MetricBarLumina';
import Flag from './Flag';
import { getOSImage } from '@/utils/osImageHelper';

interface Props {
  node: NodeInfo;
  data?: LiveData;
}

export const NodeCardLumina = ({ node, data }: Props) => {
  const cpuUsage = data?.cpu ?? 0;
  const memUsage = data?.mem ?? 0;
  const netIn = data?.net_in ?? 0;
  const isOnline = !!data;

  return (
    <div className={`lumina-card p-4 hover:scale-[1.02] ${!isOnline ? 'grayscale opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Flag countryCode={node.region} className="w-6 h-4 rounded-sm object-cover" />
          <div>
            <h3 className="text-sm font-bold leading-tight">{node.name}</h3>
            <p className="text-[10px] opacity-50 uppercase">{node.host}</p>
          </div>
        </div>
        <img src={getOSImage(node.os)} className="w-5 h-5 opacity-80" alt={node.os} />
      </div>

      <div className="space-y-3">
        <MetricBarLumina label="CPU" value={cpuUsage} color="bg-indigo-500" />
        <MetricBarLumina label="MEM" value={memUsage} color="bg-emerald-500" />
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[9px] opacity-40 uppercase font-bold">Traffic</span>
          <span className="text-[11px] font-mono">{(netIn / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
      </div>
    </div>
  );
};