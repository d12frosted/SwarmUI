"use client";

import { useGenerationStore } from "@/stores/generation";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Trash2, X } from "lucide-react";
import type { GeneratedImage } from "@/types/api";

interface BatchHistoryProps {
  onImageSelect?: (image: GeneratedImage, index: number) => void;
  selectedIndex?: number;
}

export function BatchHistory({ onImageSelect, selectedIndex }: BatchHistoryProps) {
  const { batch, clearBatch, removeFromBatch } = useGenerationStore();

  if (batch.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Batch ({batch.length} image{batch.length !== 1 ? "s" : ""})
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearBatch}
          className="h-7 text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {batch.map((image, index) => (
            <div
              key={`${image.batch_id}-${index}`}
              className={`relative group shrink-0 cursor-pointer rounded-md overflow-hidden border-2 transition-colors ${
                selectedIndex === index
                  ? "border-primary"
                  : "border-transparent hover:border-muted-foreground/50"
              }`}
              onClick={() => onImageSelect?.(image, index)}
            >
              <img
                src={image.image}
                alt={`Generated image ${index + 1}`}
                className="w-20 h-20 object-cover"
              />
              {/* Remove button */}
              <button
                className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromBatch(index);
                }}
              >
                <X className="h-3 w-3 text-white" />
              </button>
              {/* Index badge */}
              <div className="absolute bottom-0.5 left-0.5 px-1 py-0.5 bg-black/50 rounded text-[10px] text-white">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
