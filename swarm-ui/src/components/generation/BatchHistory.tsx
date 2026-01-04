"use client";

import { useMemo, useState } from "react";
import { useGenerationStore } from "@/stores/generation";
import { useSessionStore } from "@/stores/session";
import { deleteImage, toggleImageStarred } from "@/lib/api";
import { Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const { batch, removeFromBatch, starredImages, setImageStarred } = useGenerationStore();
  const { sessionId } = useSessionStore();
  const [size, setSize] = useState<ThumbnailSize>("S");
  const [deleteTarget, setDeleteTarget] = useState<{ image: GeneratedImage; index: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reverse batch so newest is first
  const reversedBatch = useMemo(() => [...batch].reverse(), [batch]);

  // Check if image is starred
  const isImageStarred = (image: GeneratedImage): boolean => {
    if (image.image in starredImages) {
      return starredImages[image.image];
    }
    const extraData = (image.metadata?.sui_extra_data || image.metadata?.Sui_extra_data || {}) as Record<string, unknown>;
    return !!(image.metadata?.starred || extraData.starred);
  };

  const handleStar = async (e: React.MouseEvent, image: GeneratedImage) => {
    e.stopPropagation();
    if (!sessionId || image.image.startsWith("data:")) return;

    const imagePath = image.image.replace(/^\/Output\//, "");
    try {
      const result = await toggleImageStarred(imagePath, sessionId);
      // Set both path formats for compatibility between generate and history pages
      setImageStarred(image.image, result.new_state);
      setImageStarred(imagePath, result.new_state);
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !sessionId) return;

    setIsDeleting(true);
    try {
      // Try to delete from disk if it's a saved file (not a data URL)
      if (!deleteTarget.image.image.startsWith("data:")) {
        const imagePath = deleteTarget.image.image.replace(/^\/Output\//, "");
        try {
          await deleteImage(imagePath, sessionId);
        } catch (e) {
          console.warn("Could not delete from disk:", e);
        }
      }

      // Remove from batch
      removeFromBatch(deleteTarget.index);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (batch.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Generated images will appear here
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Header with title, count and size selector */}
      <div className="flex items-center justify-between mb-2 shrink-0 gap-2">
        <span className="text-sm font-medium">History</span>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {batch.length} image{batch.length !== 1 ? "s" : ""}
          </span>

          {/* Size selector */}
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
              {/* Action buttons */}
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className={cn(
                    "p-1 bg-black/50 rounded hover:bg-black/70",
                    isImageStarred(image) && "text-yellow-500"
                  )}
                  onClick={(e) => handleStar(e, image)}
                  title={isImageStarred(image) ? "Unstar" : "Star"}
                >
                  <Star className={cn("h-3 w-3 text-white", isImageStarred(image) && "fill-yellow-500 text-yellow-500")} />
                </button>
                <button
                  className="p-1 bg-black/50 rounded hover:bg-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ image, index: originalIndex });
                  }}
                  title="Delete image"
                >
                  <Trash2 className="h-3 w-3 text-white" />
                </button>
              </div>
              {/* Starred indicator (always visible when starred) */}
              {isImageStarred(image) && (
                <div className="absolute top-1 left-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                </div>
              )}
              {/* Index badge */}
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 rounded text-[10px] text-white">
                {originalIndex + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the image from your session history and delete it from disk. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
