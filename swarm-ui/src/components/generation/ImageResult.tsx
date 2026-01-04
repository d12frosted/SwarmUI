"use client";

import { useState, useCallback, useEffect } from "react";
import { useGenerationStore } from "@/stores/generation";
import { useSessionStore } from "@/stores/session";
import { useParametersStore } from "@/stores/parameters";
import { useLoraStore } from "@/stores/loras";
import { Button } from "@/components/ui/button";
import { ImageViewerDialog, ImageDetailsPanel } from "@/components/shared";
import { deleteImage, toggleImageStarred } from "@/lib/api";
import { extractConfigFromMetadata } from "@/lib/metadata";
import {
  ZoomIn,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Star,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { GeneratedImage } from "@/types/api";

type PreviewRatio = "S" | "M" | "L";

const RATIO_CONFIG: Record<PreviewRatio, { imageClass: string; metadataClass: string; label: string }> = {
  L: { imageClass: "lg:flex-[3]", metadataClass: "lg:flex-1 lg:max-w-xs", label: "L" },
  M: { imageClass: "lg:flex-[2]", metadataClass: "lg:flex-1", label: "M" },
  S: { imageClass: "lg:flex-1", metadataClass: "lg:flex-[2]", label: "S" },
};

interface ImageResultProps {
  className?: string;
  selectedIndex?: number;
  onIndexChange?: (index: number) => void;
}

export function ImageResult({ className, selectedIndex, onIndexChange }: ImageResultProps) {
  const { currentRequest, batch, removeFromBatch } = useGenerationStore();
  const { sessionId } = useSessionStore();
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewRatio, setPreviewRatio] = useState<PreviewRatio>("S");
  const [starredImages, setStarredImages] = useState<Record<string, boolean>>({});

  const previewImage = currentRequest?.previewImage;
  const isGenerating = currentRequest?.status === "generating";
  const progress = currentRequest?.progress;

  // Determine which image to display
  const currentIndex = selectedIndex ?? (batch.length > 0 ? batch.length - 1 : -1);
  const displayImage = currentIndex >= 0 && currentIndex < batch.length ? batch[currentIndex] : null;

  // Navigation
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < batch.length - 1;

  const handleNavigate = useCallback((delta: number) => {
    const newIndex = currentIndex + delta;
    if (newIndex >= 0 && newIndex < batch.length) {
      onIndexChange?.(newIndex);
    }
  }, [currentIndex, batch.length, onIndexChange]);

  // Keyboard navigation - left=newer, right=older
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullViewOpen) return; // Let dialog handle its own keys
      if (e.key === "ArrowLeft" && canGoNext) {
        handleNavigate(1);
      } else if (e.key === "ArrowRight" && canGoPrev) {
        handleNavigate(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullViewOpen, canGoPrev, canGoNext, handleNavigate]);

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.image);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `swarm-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  };

  const handleUseConfig = (image: GeneratedImage) => {
    if (image.metadata) {
      const config = extractConfigFromMetadata(image.metadata);
      useParametersStore.getState().setValues(config);
      // Sync LoRA UI from the updated parameters
      useLoraStore.getState().syncFromParams();
    }
  };

  // Check if image is starred (from local state or metadata)
  const isImageStarred = (image: GeneratedImage): boolean => {
    // Check local state first
    if (image.image in starredImages) {
      return starredImages[image.image];
    }
    // Fall back to metadata
    const extraData = (image.metadata?.sui_extra_data || image.metadata?.Sui_extra_data || {}) as Record<string, unknown>;
    return !!(image.metadata?.starred || extraData.starred);
  };

  const handleStar = async (image: GeneratedImage) => {
    if (!sessionId || image.image.startsWith("data:")) return;

    const imagePath = image.image.replace(/^\/Output\//, "");
    try {
      const result = await toggleImageStarred(imagePath, sessionId);
      setStarredImages(prev => ({ ...prev, [image.image]: result.starred }));
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  const handleDelete = async () => {
    if (!displayImage || !sessionId) return;

    setIsDeleting(true);
    try {
      // Try to delete from disk if it's a saved file (not a data URL)
      if (!displayImage.image.startsWith("data:")) {
        const imagePath = displayImage.image.replace(/^\/Output\//, "");
        try {
          await deleteImage(imagePath, sessionId);
        } catch (e) {
          console.warn("Could not delete from disk:", e);
        }
      }

      // Remove from batch
      removeFromBatch(currentIndex);

      // Navigate to previous or next image
      if (currentIndex > 0) {
        onIndexChange?.(currentIndex - 1);
      } else if (batch.length > 1) {
        onIndexChange?.(0);
      }
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const ratioConfig = RATIO_CONFIG[previewRatio];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Ratio selector */}
      <div className="flex items-center justify-end mb-2 shrink-0">
        <div className="flex items-center gap-0.5">
          {(Object.keys(RATIO_CONFIG) as PreviewRatio[]).map((r) => (
            <button
              key={r}
              className={cn(
                "px-1.5 py-0.5 text-xs font-medium rounded transition-colors",
                previewRatio === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={() => setPreviewRatio(r)}
              title={r === "S" ? "Small image, large metadata" : r === "M" ? "Balanced" : "Large image, small metadata"}
            >
              {RATIO_CONFIG[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content - split into image and metadata */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        {/* Image section - configurable size */}
        <div className={cn("flex-1 flex flex-col min-h-0 min-w-0", ratioConfig.imageClass)}>
          <div className="flex-1 relative rounded-lg overflow-hidden flex items-start justify-center bg-muted/30 min-h-0">
            {isGenerating && previewImage ? (
              // Show preview during generation
              <div className="relative max-w-full max-h-full">
                <img
                  src={previewImage}
                  alt="Generation preview"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-white bg-black/50 px-4 py-2 rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                    <p className="text-sm font-medium">
                      {progress
                        ? `${Math.round(progress.overall_percent * 100)}%`
                        : "Generating..."}
                    </p>
                  </div>
                </div>
              </div>
            ) : displayImage ? (
              // Show generated image
              <div className="relative max-w-full max-h-full group">
                <img
                  src={displayImage.image}
                  alt="Generated image"
                  className="max-w-full max-h-full object-contain cursor-pointer rounded-lg"
                  onClick={() => setFullViewOpen(true)}
                />

                {/* Navigation arrows - left=newer, right=older */}
                {canGoNext && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleNavigate(1); }}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                {canGoPrev && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleNavigate(-1); }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}

                {/* Overlay actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); setFullViewOpen(true); }}
                    title="Full view"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={cn("h-8 w-8", isImageStarred(displayImage) && "text-yellow-500")}
                    onClick={(e) => { e.stopPropagation(); handleStar(displayImage); }}
                    title={isImageStarred(displayImage) ? "Unstar" : "Star"}
                  >
                    <Star className={cn("h-4 w-4", isImageStarred(displayImage) && "fill-current")} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image counter */}
                {batch.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-xs">
                    {currentIndex + 1} / {batch.length}
                  </div>
                )}
              </div>
            ) : (
              // Empty state
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Generated images will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Metadata panel - side by side on large screens */}
        {displayImage && (
          <div className={cn("border rounded-lg overflow-hidden flex flex-col min-h-0", ratioConfig.metadataClass)}>
            <ImageDetailsPanel
              metadata={displayImage.metadata}
              onDownload={() => handleDownload(displayImage)}
              onUseConfig={() => handleUseConfig(displayImage)}
              onStar={() => handleStar(displayImage)}
              onDelete={() => setDeleteDialogOpen(true)}
              isStarred={isImageStarred(displayImage)}
              showActions={true}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            />
          </div>
        )}
      </div>

      {/* Full View Dialog */}
      {displayImage && (
        <ImageViewerDialog
          open={fullViewOpen}
          onOpenChange={setFullViewOpen}
          imageSrc={displayImage.image}
          metadata={displayImage.metadata}
          onDownload={() => handleDownload(displayImage)}
          onUseConfig={() => handleUseConfig(displayImage)}
          onStar={() => handleStar(displayImage)}
          onDelete={() => setDeleteDialogOpen(true)}
          isStarred={isImageStarred(displayImage)}
          showNavigation={batch.length > 1}
          currentIndex={currentIndex}
          totalCount={batch.length}
          onNavigate={handleNavigate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
