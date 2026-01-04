"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useGenerationStore } from "@/stores/generation";
import { useParametersStore } from "@/stores/parameters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageViewerDialog } from "@/components/shared";
import {
  Download,
  ZoomIn,
  Copy,
  Loader2,
  Paintbrush,
} from "lucide-react";
import type { GeneratedImage } from "@/types/api";

// Dynamic import for ImageEditor to avoid SSR issues with Fabric.js
const ImageEditor = dynamic(
  () => import("@/components/image-editor").then((mod) => mod.ImageEditor),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div> }
);

interface ImageResultProps {
  className?: string;
}

export function ImageResult({ className }: ImageResultProps) {
  const { currentRequest, batch } = useGenerationStore();
  const { setValue } = useParametersStore();
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editImage, setEditImage] = useState<GeneratedImage | null>(null);
  const [currentMask, setCurrentMask] = useState<string | null>(null);

  const previewImage = currentRequest?.previewImage;
  const isGenerating = currentRequest?.status === "generating";
  const progress = currentRequest?.progress;

  // Get the most recent image or preview
  const displayImage = batch.length > 0 ? batch[batch.length - 1] : null;

  const handleOpenFullView = (image: GeneratedImage) => {
    setSelectedImage(image);
    setFullViewOpen(true);
  };

  const handleOpenEditor = (image: GeneratedImage) => {
    setEditImage(image);
    setCurrentMask(null);
    setEditDialogOpen(true);
  };

  const handleMaskExport = (maskDataUrl: string) => {
    setCurrentMask(maskDataUrl);
  };

  const handleApplyInpaint = () => {
    if (!editImage || !currentMask) return;

    // Set up inpainting parameters
    setValue("initimage", editImage.image);
    setValue("maskimage", currentMask);
    // Note: The actual inpainting mode might need additional parameters
    // depending on SwarmUI's API

    setEditDialogOpen(false);
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
      <div className="flex-1 relative rounded-lg overflow-hidden flex items-start justify-center">
        {isGenerating && previewImage ? (
          // Show preview during generation - scale up to fill container
          <div className="relative w-full max-h-full">
            <img
              src={previewImage}
              alt="Generation preview"
              className="w-full max-h-full object-contain rounded-lg"
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
          <div className="relative w-full max-h-full group">
            <img
              src={displayImage.image}
              alt="Generated image"
              className="w-full max-h-full object-contain cursor-pointer rounded-lg"
              onClick={() => handleOpenFullView(displayImage)}
            />
            {/* Overlay actions */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <div className="flex gap-2 bg-black/40 p-2 rounded-lg">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleOpenFullView(displayImage)}
                  title="Full view"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleOpenEditor(displayImage)}
                  title="Edit / Inpaint"
                >
                  <Paintbrush className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleDownload(displayImage)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleCopyPrompt(displayImage)}
                  title="Copy prompt"
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
      {selectedImage && (
        <ImageViewerDialog
          open={fullViewOpen}
          onOpenChange={setFullViewOpen}
          imageSrc={selectedImage.image}
          metadata={selectedImage.metadata}
          onDownload={() => handleDownload(selectedImage)}
          onCopyPrompt={() => handleCopyPrompt(selectedImage)}
          onEdit={() => {
            setFullViewOpen(false);
            handleOpenEditor(selectedImage);
          }}
        />
      )}

      {/* Image Editor Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="!w-[90vw] !max-w-4xl !max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Image / Create Inpaint Mask</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-auto">
            {editImage && (
              <ImageEditor
                width={512}
                height={512}
                imageUrl={editImage.image}
                onMaskExport={handleMaskExport}
                className="mx-auto"
              />
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <div className="flex items-center gap-2 mr-auto">
              {currentMask && (
                <span className="text-sm text-green-600">Mask ready</span>
              )}
            </div>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyInpaint} disabled={!currentMask}>
              Apply for Inpainting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
