"use client";

import { useGenerationStore } from "@/stores/generation";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import type { GeneratedImage } from "@/types/api";

interface BatchHistoryProps {
  onImageSelect?: (image: GeneratedImage, index: number) => void;
  selectedIndex?: number;
}

export function BatchHistory({ onImageSelect, selectedIndex }: BatchHistoryProps) {
  const { batch, clearBatch, removeFromBatch } = useGenerationStore();

  if (batch.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Generated images will appear here
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-xs text-muted-foreground">
          {batch.length} image{batch.length !== 1 ? "s" : ""}
        </span>
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

      <div className="grid grid-cols-2 gap-2 overflow-auto flex-1">
        {batch.map((image, index) => (
          <div
            key={`${image.batch_id}-${index}`}
            className={`relative group cursor-pointer rounded-md overflow-hidden border-2 transition-colors aspect-square ${
              selectedIndex === index
                ? "border-primary"
                : "border-transparent hover:border-muted-foreground/50"
            }`}
            onClick={() => onImageSelect?.(image, index)}
          >
            <img
              src={image.image}
              alt={`Generated image ${index + 1}`}
              className="w-full h-full object-cover"
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
