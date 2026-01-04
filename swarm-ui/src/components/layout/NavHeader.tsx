"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStatusStore } from "@/stores/status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, Sliders, FolderOpen, Settings } from "lucide-react";

const navItems = [
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/presets", label: "Presets", icon: Sliders },
  { href: "/history", label: "History", icon: FolderOpen },
  { href: "/user", label: "Settings", icon: Settings },
];

export function NavHeader() {
  const pathname = usePathname();
  const { waitingGens, liveGens, loadingModels } = useStatusStore();

  return (
    <header className="border-b bg-card shrink-0">
      <div className="flex items-center justify-between h-12 px-4">
        {/* Logo and Nav */}
        <div className="flex items-center gap-6">
          <Link href="/generate" className="text-lg font-bold">
            SwarmUI
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href === "/generate" && pathname === "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          {loadingModels > 0 && (
            <Badge variant="secondary">Loading model...</Badge>
          )}
          {liveGens > 0 && (
            <Badge variant="default">{liveGens} generating</Badge>
          )}
          {waitingGens > 0 && (
            <Badge variant="outline">{waitingGens} queued</Badge>
          )}
        </div>
      </div>
    </header>
  );
}
