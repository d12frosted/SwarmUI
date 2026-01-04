"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStatusStore } from "@/stores/status";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Sparkles, Sliders, FolderOpen, Settings, Server, Wrench } from "lucide-react";

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
