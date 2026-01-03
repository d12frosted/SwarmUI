"use client";

import { useState } from "react";
import { useGenerationStore } from "@/stores/generation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  ZoomIn,
  Copy,
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { GeneratedImage } from "@/types/api";

interface ImageResultProps {
  className?: string;
}

export function ImageResult({ className }: ImageResultProps) {
  const { currentRequest, batch } = useGenerationStore();
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [fullViewOpen, setFullViewOpen] = useState(false);

  const previewImage = currentRequest?.previewImage;
  const isGenerating = currentRequest?.status === "generating";
  const progress = currentRequest?.progress;

  // Get the most recent image or preview
  const displayImage = batch.length > 0 ? batch[batch.length - 1] : null;

  const handleOpenFullView = (image: GeneratedImage) => {
    setSelectedImage(image);
    setFullViewOpen(true);
  };

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

  const handleCopyPrompt = (image: GeneratedImage) => {
    if (image.metadata?.prompt) {
      navigator.clipboard.writeText(String(image.metadata.prompt));
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Main Image Display */}
      <div className="flex-1 relative rounded-lg overflow-hidden flex items-center justify-center">
        {isGenerating && previewImage ? (
          // Show preview during generation - scale up to fill container
          <div className="relative w-full h-full">
            <img
              src={previewImage}
              alt="Generation preview"
              className="w-full h-full object-contain rounded-lg"
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
          <div className="relative w-full h-full group">
            <img
              src={displayImage.image}
              alt="Generated image"
              className="w-full h-full object-contain cursor-pointer rounded-lg"
              onClick={() => handleOpenFullView(displayImage)}
            />
            {/* Overlay actions */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <div className="flex gap-2 bg-black/40 p-2 rounded-lg">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleOpenFullView(displayImage)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleDownload(displayImage)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleCopyPrompt(displayImage)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Empty state
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Generated images will appear here</p>
          </div>
        )}
      </div>

      {/* Metadata Display */}
      {displayImage?.metadata && (
        <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
          {displayImage.metadata.prompt && (
            <p className="line-clamp-2">
              <span className="font-medium">Prompt:</span> {String(displayImage.metadata.prompt)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {displayImage.metadata.model && (
              <Badge variant="outline">{String(displayImage.metadata.model)}</Badge>
            )}
            {displayImage.metadata.seed !== undefined && (
              <Badge variant="secondary">Seed: {String(displayImage.metadata.seed)}</Badge>
            )}
            {displayImage.metadata.steps !== undefined && (
              <Badge variant="secondary">Steps: {String(displayImage.metadata.steps)}</Badge>
            )}
            {displayImage.metadata.cfgscale !== undefined && (
              <Badge variant="secondary">CFG: {String(displayImage.metadata.cfgscale)}</Badge>
            )}
          </div>
        </div>
      )}

      {/* Full View Dialog */}
      <Dialog open={fullViewOpen} onOpenChange={setFullViewOpen}>
        <DialogContent className="!w-[90vw] !h-[90vh] !max-w-[90vw] !max-h-[90vh] !p-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Image Details</DialogTitle>
          </VisuallyHidden>
          {selectedImage && (
            <div className="flex flex-col lg:flex-row h-full">
              {/* Image - takes most of the space */}
              <div className="flex-1 flex items-center justify-center bg-black/95">
                <img
                  src={selectedImage.image}
                  alt="Generated image"
                  className="max-w-full max-h-[90vh] object-contain"
                />
              </div>

              {/* Details Panel */}
              <div className="w-full lg:w-96 bg-background border-l flex flex-col shrink-0">
                <div className="p-4 border-b shrink-0">
                  <h2 className="font-semibold">Image Details</h2>
                </div>

                {/* Actions */}
                <div className="flex gap-2 p-4 border-b shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(selectedImage)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyPrompt(selectedImage)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Prompt
                  </Button>
                </div>

                {/* Metadata */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3 text-sm">
                    {Object.entries(selectedImage.metadata || {}).length === 0 ? (
                      <p className="text-muted-foreground">No metadata available</p>
                    ) : (
                      Object.entries(selectedImage.metadata || {}).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <span className="font-medium text-muted-foreground capitalize text-xs">
                            {key}
                          </span>
                          <p className="break-words">
                            {String(value)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
