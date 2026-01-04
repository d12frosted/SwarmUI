"use client";

import { useMemo, useState } from "react";
import { useGenerationStore } from "@/stores/generation";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedImage } from "@/types/api";

type ThumbnailSize = "S" | "M" | "L" | "XL";

const SIZE_CONFIG: Record<ThumbnailSize, { cols: string; label: string }> = {
  S: { cols: "grid-cols-4", label: "S" },
  M: { cols: "grid-cols-3", label: "M" },
  L: { cols: "grid-cols-2", label: "L" },
  XL: { cols: "grid-cols-1", label: "XL" },
};

interface BatchHistoryProps {
  onImageSelect?: (image: GeneratedImage, index: number) => void;
  selectedIndex?: number;
}

export function BatchHistory({ onImageSelect, selectedIndex }: BatchHistoryProps) {
  const { batch, clearBatch, removeFromBatch } = useGenerationStore();
  const [size, setSize] = useState<ThumbnailSize>("L");

  // Reverse batch so newest is first
  const reversedBatch = useMemo(() => [...batch].reverse(), [batch]);

  if (batch.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Generated images will appear here
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header with count, size selector, and clear */}
      <div className="flex items-center justify-between mb-2 shrink-0 gap-2">
        <span className="text-xs text-muted-foreground">
          {batch.length} image{batch.length !== 1 ? "s" : ""}
        </span>

        <div className="flex items-center gap-1">
          {/* Size selector - styled like history page */}
          <div className="flex items-center gap-0.5">
            {(Object.keys(SIZE_CONFIG) as ThumbnailSize[]).map((s) => (
              <button
                key={s}
                className={cn(
                  "px-1.5 py-0.5 text-xs font-medium rounded transition-colors",
                  size === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => setSize(s)}
              >
                {SIZE_CONFIG[s].label}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearBatch}
            className="h-6 text-xs px-2"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Image grid */}
      <div
        className={cn(
          "grid gap-2 overflow-auto flex-1 min-h-0 content-start",
          SIZE_CONFIG[size].cols
        )}
      >
        {reversedBatch.map((image, reversedIndex) => {
          // Calculate original index for selection
          const originalIndex = batch.length - 1 - reversedIndex;

          return (
            <div
              key={`${image.batch_id}-${originalIndex}`}
              className={cn(
                "relative group cursor-pointer rounded-md overflow-hidden border-2 transition-colors bg-muted/30",
                selectedIndex === originalIndex
                  ? "border-primary"
                  : "border-transparent hover:border-muted-foreground/50"
              )}
              onClick={() => onImageSelect?.(image, originalIndex)}
            >
              <img
                src={image.image}
                alt={`Generated image ${originalIndex + 1}`}
                className="w-full h-auto object-contain"
              />
              {/* Remove button */}
              <button
                className="absolute top-1 right-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromBatch(originalIndex);
                }}
              >
                <X className="h-3 w-3 text-white" />
              </button>
              {/* Index badge */}
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 rounded text-[10px] text-white">
                {originalIndex + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
