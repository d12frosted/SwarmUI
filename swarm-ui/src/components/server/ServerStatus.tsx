"use client";

import { useStatusStore } from "@/stores/status";
import { useSessionStore } from "@/stores/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { interruptAll } from "@/lib/api";
import { toast } from "sonner";
import {
  Server,
  Layers,
  Loader2,
  Play,
  Clock,
  Square,
  Zap,
  CheckCircle2,
} from "lucide-react";

export function ServerStatus() {
  const {
    waitingGens,
    liveGens,
    loadingModels,
    waitingBackends,
    supportedFeatures,
    lastPollTime,
  } = useStatusStore();
  const { sessionId, version, serverId } = useSessionStore();

  const handleInterruptAll = async () => {
    if (!sessionId) return;
    try {
      await interruptAll(sessionId);
      toast.success("All generations interrupted");
    } catch (error) {
      toast.error("Failed to interrupt generations");
      console.error(error);
    }
  };

  const isActive = liveGens > 0 || waitingGens > 0 || loadingModels > 0;

  return (
    <div className="space-y-4">
      {/* Server Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="h-4 w-4" />
            Server Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <Badge variant="outline">{version || "Unknown"}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Server ID</span>
            <span className="font-mono text-xs">{serverId || "N/A"}</span>
          </div>
          {lastPollTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Update</span>
              <span className="text-xs">
                {new Date(lastPollTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Generation Queue
            </span>
            {isActive && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleInterruptAll}
              >
                <Square className="h-3 w-3 mr-1" />
                Interrupt All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-primary/10">
                <Play className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveGens}</p>
                <p className="text-xs text-muted-foreground">Generating</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Clock className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{waitingGens}</p>
                <p className="text-xs text-muted-foreground">Queued</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Loader2 className={`h-4 w-4 text-blue-500 ${loadingModels > 0 ? "animate-spin" : ""}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{loadingModels}</p>
                <p className="text-xs text-muted-foreground">Loading Models</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{waitingBackends}</p>
                <p className="text-xs text-muted-foreground">Idle Backends</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported Features */}
      {supportedFeatures.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Supported Features
            </CardTitle>
            <CardDescription>
              Capabilities enabled on this server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {supportedFeatures.map((feature) => (
                <Badge key={feature} variant="secondary">
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
