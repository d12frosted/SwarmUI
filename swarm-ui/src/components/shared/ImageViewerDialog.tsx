"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageDetailsPanel } from "./ImageDetailsPanel";
import type { ImageMetadata } from "@/types/api";

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  metadata?: ImageMetadata;
  onDownload?: () => void;
  onEdit?: () => void;
  onUseConfig?: () => void;
  // Navigation
  showNavigation?: boolean;
  currentIndex?: number;
  totalCount?: number;
  onNavigate?: (delta: number) => void;
  // Optional subtitle
  subtitle?: string;
}

export function ImageViewerDialog({
  open,
  onOpenChange,
  imageSrc,
  metadata,
  onDownload,
  onEdit,
  onUseConfig,
  showNavigation = false,
  currentIndex = 0,
  totalCount = 1,
  onNavigate,
  subtitle,
}: ImageViewerDialogProps) {
  const canGoPrev = showNavigation && currentIndex > 0;
  const canGoNext = showNavigation && currentIndex < totalCount - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[90vw] !h-[90vh] !max-w-[90vw] !max-h-[90vh] !p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Image Details</DialogTitle>
        </VisuallyHidden>

        <div className="flex flex-col lg:flex-row h-full">
          {/* Image - takes most of the space */}
          <div className="flex-1 flex items-center justify-center bg-black/95 relative min-h-0">
            <img
              src={imageSrc}
              alt="Full view"
              className="max-w-full max-h-[90vh] object-contain"
            />

            {/* Navigation arrows - left=newer, right=older */}
            {canGoNext && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2"
                onClick={() => onNavigate?.(1)}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            {canGoPrev && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2"
                onClick={() => onNavigate?.(-1)}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}

            {/* Image counter */}
            {showNavigation && totalCount > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                {currentIndex + 1} / {totalCount}
              </div>
            )}
          </div>

          {/* Details Panel */}
          <div className="w-full lg:w-96 bg-background border-l flex flex-col shrink-0 max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b shrink-0">
              <h2 className="font-semibold">Image Details</h2>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>

            <ImageDetailsPanel
              metadata={metadata}
              onDownload={onDownload}
              onEdit={onEdit}
              onUseConfig={onUseConfig}
              showActions={!!(onDownload || onEdit || onUseConfig)}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
