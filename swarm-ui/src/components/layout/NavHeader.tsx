"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStatusStore } from "@/stores/status";
import { useDownloadsStore, formatSpeed, formatBytes, formatElapsed, estimateTimeRemainingFromBytes } from "@/stores/downloads";
import { useGenerationStore } from "@/stores/generation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Sparkles, Sliders, FolderOpen, Settings, Server, Wrench, Download, CheckCircle2, XCircle, Image, Loader2, X, Repeat, Clock, RefreshCw, Plus } from "lucide-react";
import { useSessionStore } from "@/stores/session";
import { interruptAll } from "@/lib/api";

const navItems = [
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/presets", label: "Presets", icon: Sliders },
  { href: "/history", label: "History", icon: FolderOpen },
  { href: "/utilities", label: "Utilities", icon: Wrench },
  { href: "/server", label: "Server", icon: Server },
  { href: "/user", label: "Settings", icon: Settings },
];

export function NavHeader() {
  const pathname = usePathname();
  const { sessionId, sessionStartTime, createNewSession } = useSessionStore();
  const { waitingGens, liveGens, loadingModels } = useStatusStore();
  const { downloads } = useDownloadsStore();
  const {
    isGenerating,
    isGeneratingForever,
    isReconnected,
    reconnectedGenerations,
    activeRequests,
    batch,
    cancelAllGenerations,
    clearBatch,
    checkActiveGenerations,
    startPolling,
    stopPolling,
    getPrimaryRequest,
    getActiveCount,
    getTotalImageCount,
  } = useGenerationStore();

  // Get primary reconnected generation (the one actively generating)
  const reconnectedGeneration = reconnectedGenerations.find(g => g.live_gens > 0) || reconnectedGenerations[0];
  const { generating: reconnectedGenerating, queued: reconnectedQueued } =
    isReconnected ? getTotalImageCount() : { generating: 0, queued: 0 };

  const primaryRequest = getPrimaryRequest();
  const activeCount = getActiveCount();
  const queuedCount = Math.max(0, activeCount - 1);

  // Check for active generations on mount (only once)
  const hasCheckedRef = useRef(false);
  useEffect(() => {
    if (sessionId && !hasCheckedRef.current) {
      hasCheckedRef.current = true;
      console.log("[NavHeader] Checking for active generations...");
      checkActiveGenerations(sessionId, sessionStartTime || undefined);
    }
  }, [sessionId, sessionStartTime, checkActiveGenerations]);

  // Start polling when reconnected
  useEffect(() => {
    if (isReconnected && sessionId) {
      console.log("[NavHeader] Starting polling for reconnected generation");
      startPolling(sessionId, 2000);
    }
    return () => {
      stopPolling();
    };
  }, [isReconnected, sessionId, startPolling, stopPolling]);

  const activeDownloads = downloads.filter(
    (d) => d.status === "downloading" || d.status === "pending"
  );
  const hasDownloads = downloads.length > 0;
  const hasGenerationActivity = isGenerating || batch.length > 0;

  // Force re-render every second while downloads or generations are active
  const [, setTick] = useState(0);
  useEffect(() => {
    if (activeDownloads.length === 0 && !isGenerating) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeDownloads.length, isGenerating]);

  return (
    <header className="border-b bg-card shrink-0">
      <div className="flex items-center justify-between h-12 px-2 sm:px-4">
        {/* Logo and Nav */}
        <div className="flex items-center gap-2 sm:gap-6">
          <Link href="/generate" className="text-base sm:text-lg font-bold shrink-0">
            SwarmUI
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
            <TooltipProvider delayDuration={300}>
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href === "/generate" && pathname === "/");
                const Icon = item.icon;

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent className="sm:hidden">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </nav>
        </div>

        {/* Status badges - hide text on mobile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Generation Indicator - always show for session management */}
          <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors",
                    isGenerating
                      ? "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Image className="h-4 w-4" />
                  )}
                  {/* Show queue count when generating multiple */}
                  {isGenerating && activeCount > 1 && (
                    <span className="text-purple-400">+{activeCount - 1}</span>
                  )}
                  {/* Separator when both queue and batch shown */}
                  {isGenerating && activeCount > 1 && batch.length > 0 && (
                    <span className="text-muted-foreground/50">│</span>
                  )}
                  {/* Total batch count */}
                  {batch.length > 0 && (
                    <span>{batch.length}</span>
                  )}
                  {isGeneratingForever && (
                    <Repeat className="h-3 w-3 ml-0.5" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2" align="end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <p className="text-sm font-medium">
                      Generation
                      {isReconnected && (
                        <Badge variant="outline" className="text-xs ml-2">
                          <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                          Reconnected
                        </Badge>
                      )}
                    </p>
                    {isGenerating && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={async () => {
                          if (sessionId) {
                            try {
                              await interruptAll(sessionId);
                            } catch (e) {
                              console.error("Failed to interrupt:", e);
                            }
                          }
                          cancelAllGenerations();
                          stopPolling();
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>

                  {/* Reconnected Generation (polling mode) */}
                  {isReconnected && reconnectedGeneration && (
                    <div className="p-2 rounded-md bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {reconnectedGenerating > 0 ? `${reconnectedGenerating} generating` : "Generating..."}
                        </span>
                        {reconnectedQueued > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {reconnectedQueued} queued
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-2">
                        <Progress
                          value={reconnectedGeneration.current_percent * 100}
                          className="h-1.5 flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {Math.round(reconnectedGeneration.current_percent * 100)}%
                        </span>
                      </div>
                      {reconnectedGeneration.batch_index > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Image {reconnectedGeneration.batch_index + 1} • Overall {Math.round(reconnectedGeneration.overall_percent * 100)}%
                        </p>
                      )}

                      {/* Preview thumbnail */}
                      {reconnectedGeneration.preview && (
                        <div className="relative aspect-square w-full max-w-[120px] rounded overflow-hidden bg-muted mx-auto">
                          <img
                            src={reconnectedGeneration.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Model info */}
                      {reconnectedGeneration.model && (
                        <p className="text-xs text-muted-foreground truncate">
                          Model: {reconnectedGeneration.model}
                        </p>
                      )}

                      {/* Elapsed time */}
                      <p className="text-xs text-muted-foreground text-center">
                        {formatElapsed(reconnectedGeneration.start_time)} elapsed
                      </p>
                    </div>
                  )}

                  {/* Current Generation (WebSocket mode) */}
                  {primaryRequest && !isReconnected && (
                    <div className="p-2 rounded-md bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating...
                          {isGeneratingForever && (
                            <Badge variant="outline" className="text-xs ml-1">
                              <Repeat className="h-2.5 w-2.5 mr-0.5" />
                              Forever
                            </Badge>
                          )}
                        </span>
                        {activeCount > 1 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activeCount} active
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      {primaryRequest.progress && (
                        <>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={primaryRequest.progress.current_percent * 100}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {Math.round(primaryRequest.progress.current_percent * 100)}%
                            </span>
                          </div>
                          {primaryRequest.progress.batch_index > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Image {primaryRequest.progress.batch_index + 1} • Overall {Math.round(primaryRequest.progress.overall_percent * 100)}%
                            </p>
                          )}
                        </>
                      )}

                      {/* Preview thumbnail */}
                      {primaryRequest.previewImage && (
                        <div className="relative aspect-square w-full max-w-[120px] rounded overflow-hidden bg-muted mx-auto">
                          <img
                            src={primaryRequest.previewImage}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Elapsed time */}
                      <p className="text-xs text-muted-foreground text-center">
                        {formatElapsed(primaryRequest.startTime)} elapsed
                      </p>
                    </div>
                  )}

                  {/* Recent batch */}
                  {batch.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-2">
                        <p className="text-xs text-muted-foreground">
                          Recent ({batch.length} images)
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-xs"
                          onClick={() => {
                            clearBatch();
                            createNewSession();
                          }}
                        >
                          <Plus className="h-3 w-3 mr-0.5" />
                          New
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-1 px-1">
                        {batch.slice(-8).map((img, idx) => (
                          <div
                            key={idx}
                            className="aspect-square rounded overflow-hidden bg-muted"
                          >
                            <img
                              src={img.image}
                              alt={`Generated ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No activity */}
                  {!isGenerating && batch.length === 0 && (
                    <div className="flex items-center justify-between px-2 py-1">
                      <p className="text-sm text-muted-foreground">
                        No active generations
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          clearBatch();
                          createNewSession();
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        New Session
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
          </Popover>

          {/* Download Indicator */}
          {hasDownloads && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors",
                    activeDownloads.length > 0
                      ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Download
                    className={cn(
                      "h-4 w-4",
                      activeDownloads.length > 0 && "animate-pulse"
                    )}
                  />
                  {activeDownloads.length > 0 && (
                    <span>{activeDownloads.length}</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2" align="end">
                <div className="space-y-2">
                  <p className="text-sm font-medium px-2 py-1">Downloads</p>
                  {downloads.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-2 py-1">
                      No downloads
                    </p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-1.5">
                      {downloads.map((download) => (
                        <div
                          key={download.id}
                          className="p-2 rounded-md bg-muted/50 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate flex-1 mr-2">
                              {download.metadata?.title || download.name}
                            </span>
                            <span className="shrink-0">
                              {download.status === "pending" && (
                                <span className="text-xs text-muted-foreground">Starting...</span>
                              )}
                              {download.status === "complete" && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                              {download.status === "error" && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </span>
                          </div>
                          {download.status === "downloading" && (
                            <>
                              <div className="flex items-center gap-2">
                                <Progress value={download.progress} className="h-1.5 flex-1" />
                                <span className="text-xs text-muted-foreground w-8 text-right">
                                  {download.progress.toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{formatSpeed(download.speed)}</span>
                                {download.totalBytes > 0 ? (
                                  <span>{formatBytes(download.currentBytes)} / {formatBytes(download.totalBytes)}</span>
                                ) : (
                                  <span>~{estimateTimeRemainingFromBytes(download.currentBytes, download.totalBytes, download.speed)} left</span>
                                )}
                              </div>
                            </>
                          )}
                          {download.status === "complete" && (
                            <p className="text-xs text-muted-foreground">
                              Done in {formatElapsed(download.startedAt)}
                            </p>
                          )}
                          {download.error && (
                            <p className="text-xs text-red-500 truncate">
                              {download.error}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {/* Model Loading Badge - only show when no generation popover */}
          {loadingModels > 0 && !hasGenerationActivity && (
            <Badge variant="secondary" className="text-xs sm:text-sm">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              <span className="hidden sm:inline">Loading model...</span>
              <span className="sm:hidden">Loading</span>
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
