"use client";

import { useEffect } from "react";
import { useStatusStore } from "@/stores/status";
import { useSessionStore } from "@/stores/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Cpu, HardDrive, Thermometer, Activity } from "lucide-react";
import type { GPUInfo } from "@/types/api";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getTemperatureColor(temp: number): string {
  if (temp < 50) return "text-green-500";
  if (temp < 70) return "text-yellow-500";
  if (temp < 85) return "text-orange-500";
  return "text-red-500";
}

function getUtilizationColor(util: number): string {
  if (util < 30) return "bg-green-500";
  if (util < 70) return "bg-yellow-500";
  if (util < 90) return "bg-orange-500";
  return "bg-red-500";
}

interface GPUCardProps {
  gpu: GPUInfo;
}

function GPUCard({ gpu }: GPUCardProps) {
  const memoryUsedPercent = (gpu.used_memory / gpu.total_memory) * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            GPU {gpu.id}: {gpu.name}
          </span>
          <span className={`flex items-center gap-1 ${getTemperatureColor(gpu.temperature)}`}>
            <Thermometer className="h-4 w-4" />
            {gpu.temperature}°C
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GPU Utilization */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">GPU Usage</span>
            <span className="font-medium">{gpu.utilization_gpu}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getUtilizationColor(gpu.utilization_gpu)}`}
              style={{ width: `${gpu.utilization_gpu}%` }}
            />
          </div>
        </div>

        {/* Memory Utilization */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">VRAM</span>
            <span className="font-medium">
              {formatBytes(gpu.used_memory)} / {formatBytes(gpu.total_memory)}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getUtilizationColor(memoryUsedPercent)}`}
              style={{ width: `${memoryUsedPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResourceMonitor() {
  const { resourceInfo, fetchResourceInfo } = useStatusStore();
  const { sessionId } = useSessionStore();

  // Fetch resource info on mount and periodically
  useEffect(() => {
    if (!sessionId) return;

    fetchResourceInfo(sessionId);
    const interval = setInterval(() => {
      fetchResourceInfo(sessionId);
    }, 3000); // Every 3 seconds

    return () => clearInterval(interval);
  }, [sessionId, fetchResourceInfo]);

  if (!resourceInfo) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading resource information...
        </CardContent>
      </Card>
    );
  }

  const gpus = resourceInfo.gpus ?? [];
  const cpu = resourceInfo.cpu;
  const ram = resourceInfo.system_ram;
  const ramUsedPercent = ram ? (ram.used / ram.total) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* GPUs */}
      {gpus.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {gpus.map((gpu) => (
            <GPUCard key={gpu.id} gpu={gpu} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-4 text-center text-muted-foreground">
            No GPU detected
          </CardContent>
        </Card>
      )}

      {/* CPU and RAM */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* CPU */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU
              {cpu && (
                <Badge variant="secondary" className="ml-auto">
                  {cpu.cores} cores
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cpu ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="font-medium">{cpu.usage.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getUtilizationColor(cpu.usage)}`}
                    style={{ width: `${cpu.usage}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* RAM */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System RAM
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ram ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="font-medium">
                    {formatBytes(ram.used)} / {formatBytes(ram.total)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getUtilizationColor(ramUsedPercent)}`}
                    style={{ width: `${ramUsedPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
