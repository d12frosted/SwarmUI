"use client";

import { useEffect, useState, useMemo } from "react";
import { useSessionStore } from "@/stores/session";
import { usePresetStore } from "@/stores/presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, FolderOpen, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Preset } from "@/lib/api";

interface QuickPresetSelectorProps {
  className?: string;
}

export function QuickPresetSelector({ className }: QuickPresetSelectorProps) {
  const { sessionId } = useSessionStore();
  const {
    allPresets,
    activePresets,
    isLoading,
    loadPresets,
    applyPreset,
    togglePreset,
    isPresetActive,
  } = usePresetStore();

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolder, setCurrentFolder] = useState("");

  // Load presets on mount
  useEffect(() => {
    if (sessionId && allPresets.length === 0) {
      loadPresets(sessionId);
    }
  }, [sessionId, loadPresets, allPresets.length]);

  // Get folders and files in current folder
  const { folders, presets } = useMemo(() => {
    const prefix = currentFolder ? `${currentFolder}/` : "";
    const folderSet = new Set<string>();
    const fileList: Preset[] = [];

    for (const preset of allPresets) {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = preset.title.toLowerCase().includes(query);
        const matchesDesc = preset.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) continue;
      }

      if (!preset.title.startsWith(prefix)) continue;

      const subPart = preset.title.substring(prefix.length);
      const slashIndex = subPart.indexOf("/");

      if (slashIndex !== -1) {
        const folder = subPart.substring(0, slashIndex);
        folderSet.add(folder);
      } else {
        fileList.push(preset);
      }
    }

    return {
      folders: Array.from(folderSet).sort(),
      presets: fileList,
    };
  }, [allPresets, currentFolder, searchQuery]);

  const handleApply = (preset: Preset) => {
    applyPreset(preset);
    setOpen(false);
    setSearchQuery("");
    setCurrentFolder("");
  };

  const handleToggle = (preset: Preset) => {
    togglePreset(preset);
  };

  // Get short name (last part after /)
  const getShortName = (title: string) => {
    const parts = title.split("/");
    return parts[parts.length - 1];
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            disabled={isLoading}
          >
            Presets
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search presets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>

          {/* Breadcrumb */}
          {currentFolder && (
            <div className="flex items-center gap-1 px-2 py-1.5 text-xs border-b bg-muted/50">
              <button
                className="text-primary hover:underline"
                onClick={() => setCurrentFolder("")}
              >
                Root
              </button>
              {currentFolder.split("/").map((part, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-muted-foreground">/</span>
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setCurrentFolder(arr.slice(0, i + 1).join("/"))}
                  >
                    {part}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <ScrollArea className="h-64">
            <div className="p-1">
              {/* Folders */}
              {folders.map((folder) => (
                <button
                  key={folder}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-muted"
                  onClick={() =>
                    setCurrentFolder(currentFolder ? `${currentFolder}/${folder}` : folder)
                  }
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  {folder}
                </button>
              ))}

              {/* Presets */}
              {presets.map((preset) => {
                const isActive = isPresetActive(preset.title);
                return (
                  <div
                    key={preset.title}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-sm hover:bg-muted group"
                  >
                    <button
                      className="flex-1 text-left text-sm truncate"
                      onClick={() => handleApply(preset)}
                      title={preset.description || preset.title}
                    >
                      {getShortName(preset.title)}
                    </button>
                    <button
                      className={cn(
                        "p-0.5 rounded-sm transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(preset);
                      }}
                      title={isActive ? "Deactivate preset" : "Activate preset"}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              {/* Empty state */}
              {folders.length === 0 && presets.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {searchQuery ? "No matches" : "No presets"}
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Active presets badges */}
      {activePresets.length > 0 && (
        <div className="flex items-center gap-1 overflow-hidden">
          {activePresets.slice(0, 2).map((preset) => (
            <Badge
              key={preset.title}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => togglePreset(preset)}
            >
              {getShortName(preset.title)}
            </Badge>
          ))}
          {activePresets.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{activePresets.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
