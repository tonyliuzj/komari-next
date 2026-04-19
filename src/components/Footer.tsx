"use client";

import { useEffect, useState } from 'react';
import { useRPC2Call } from '@/contexts/RPC2Context';
import { Github, Heart, Server } from 'lucide-react';
import themeMetadata from '../../komari-theme.json';

const Footer = () => {
  const formatBuildTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Shanghai'
    }) + ' (GMT+8)';
  };

  const buildTime = null;
  const [versionInfo, setVersionInfo] = useState<{ hash: string; version: string } | null>(null);
  const { call } = useRPC2Call();

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const data = await call("common:getVersion")
        setVersionInfo({ hash: data.hash?.slice(0, 7), version: data.version });
      } catch (error) {
        console.error('Failed to fetch version info:', error);
      }
    };

    fetchVersionInfo();
  }, [call]);

  return (
    <footer className="border-t bg-gradient-to-b from-card/30 to-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <Server className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Komari Monitor
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-left max-w-xs">
              Real-time server monitoring with modern design and powerful features
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <h4 className="text-sm font-semibold text-foreground">Powered By</h4>
            <div className="flex flex-col items-center gap-2 text-center">
              <a
                href="https://github.com/tonyliuzj/komari-next"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <Github className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Komari-Next</span>
              </a>
              <div className="flex items-center gap-1 text-xs text-muted-foreground justify-center">
                <span>Made with</span>
                <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
                <span>for Komari</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            <h4 className="text-sm font-semibold text-foreground">Version Info</h4>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground text-center md:text-right">
              {buildTime && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Build:</span>
                  <span>{formatBuildTime(buildTime)}</span>
                </div>
              )}
              {versionInfo && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Version:</span>
                    <span className="font-mono">{versionInfo.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Theme:</span>
                    <span className="font-mono">{themeMetadata.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Commit:</span>
                    <code className="px-1.5 py-0.5 bg-muted rounded font-mono text-[10px]">
                      {versionInfo.hash}
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-center text-xs text-muted-foreground">
            <span className="font-medium">Komari Monitor</span> - Professional Server Monitoring Solution
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
