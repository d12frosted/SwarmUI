"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStatusStore } from "@/stores/status";
import { useDownloadsStore, formatSpeed, formatBytes, formatElapsed, estimateTimeRemainingFromBytes } from "@/stores/downloads";
import { Badge } from "@/components/ui/badge";
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
import { Sparkles, Sliders, FolderOpen, Settings, Server, Wrench, Download, CheckCircle2, XCircle } from "lucide-react";

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
  const { waitingGens, liveGens, loadingModels } = useStatusStore();
  const { downloads } = useDownloadsStore();

  const activeDownloads = downloads.filter(
    (d) => d.status === "downloading" || d.status === "pending"
  );
  const hasDownloads = downloads.length > 0;

  // Force re-render every second while downloads are active to update elapsed time
  const [, setTick] = useState(0);
  useEffect(() => {
    if (activeDownloads.length === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeDownloads.length]);

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
          {loadingModels > 0 && (
            <Badge variant="secondary" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Loading model...</span>
              <span className="sm:hidden">Loading</span>
            </Badge>
          )}
          {liveGens > 0 && (
            <Badge variant="default" className="text-xs sm:text-sm">
              {liveGens} <span className="hidden sm:inline">generating</span>
            </Badge>
          )}
          {waitingGens > 0 && (
            <Badge variant="outline" className="text-xs sm:text-sm">
              {waitingGens} <span className="hidden sm:inline">queued</span>
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
