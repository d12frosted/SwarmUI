"use client";

import { usePresetStore } from "@/stores/presets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Play, Trash2 } from "lucide-react";

interface ActivePresetsProps {
  className?: string;
}

export function ActivePresets({ className }: ActivePresetsProps) {
  const { activePresets, removeActivePreset, clearActivePresets, applyActivePresets } =
    usePresetStore();

  if (activePresets.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-xs text-muted-foreground">Active:</span>
      {activePresets.map((preset) => {
        // Get display name (last part of path)
        const displayName = preset.title.includes("/")
          ? preset.title.substring(preset.title.lastIndexOf("/") + 1)
          : preset.title;

        return (
          <Badge
            key={preset.title}
            variant="secondary"
            className="gap-1 pr-1"
          >
            {displayName}
            <button
              className="ml-1 rounded-full hover:bg-muted p-0.5"
              onClick={() => removeActivePreset(preset.title)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs"
          onClick={applyActivePresets}
        >
          <Play className="h-3 w-3 mr-1" />
          Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={clearActivePresets}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
