"use client";

import { useEffect, useRef, useState } from "react";
import { useGenerationStore } from "@/stores/generation";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Trash2, X, LayoutGrid, Columns2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedImage } from "@/types/api";

type GridColumns = 1 | 2 | 3 | 4;

interface BatchHistoryProps {
  onImageSelect?: (image: GeneratedImage, index: number) => void;
  selectedIndex?: number;
}

export function BatchHistory({ onImageSelect, selectedIndex }: BatchHistoryProps) {
  const { batch, clearBatch, removeFromBatch } = useGenerationStore();
  const [columns, setColumns] = useState<GridColumns>(2);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevBatchLength = useRef(batch.length);

  // Auto-scroll to bottom when new images are added
  useEffect(() => {
    if (batch.length > prevBatchLength.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevBatchLength.current = batch.length;
  }, [batch.length]);

  if (batch.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Generated images will appear here
      </div>
    );
  }

  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns];

  return (
    <div className="h-full flex flex-col">
      {/* Header with count, column selector, and clear */}
      <div className="flex items-center justify-between mb-2 shrink-0 gap-2">
        <span className="text-xs text-muted-foreground">
          {batch.length} image{batch.length !== 1 ? "s" : ""}
        </span>

        <div className="flex items-center gap-1">
          {/* Column selector */}
          <div className="flex items-center border rounded">
            {([1, 2, 3, 4] as GridColumns[]).map((col) => (
              <button
                key={col}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] transition-colors",
                  columns === col
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => setColumns(col)}
              >
                {col}
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
        ref={scrollRef}
        className={cn("grid gap-2 overflow-auto flex-1 content-start", gridClass)}
      >
        {batch.map((image, index) => (
          <div
            key={`${image.batch_id}-${index}`}
            className={cn(
              "relative group cursor-pointer rounded-md overflow-hidden border-2 transition-colors bg-muted/30",
              selectedIndex === index
                ? "border-primary"
                : "border-transparent hover:border-muted-foreground/50"
            )}
            onClick={() => onImageSelect?.(image, index)}
          >
            <img
              src={image.image}
              alt={`Generated image ${index + 1}`}
              className="w-full h-auto object-contain"
            />
            {/* Remove button */}
            <button
              className="absolute top-1 right-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                removeFromBatch(index);
              }}
            >
              <X className="h-3 w-3 text-white" />
            </button>
            {/* Index badge */}
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 rounded text-[10px] text-white">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
