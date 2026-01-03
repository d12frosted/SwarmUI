"use client";

import { useState, useEffect, useCallback } from "react";
import { useSessionStore } from "@/stores/session";
import { listImages } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen,
  ArrowUp,
  RefreshCw,
  Search,
  Download,
  Copy,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ImageMetadata } from "@/types/api";

interface OutputImage {
  src: string;
  metadata?: string | ImageMetadata;
}

interface OutputBrowserProps {
  className?: string;
  onImageSelect?: (src: string, metadata?: ImageMetadata) => void;
}

export function OutputBrowser({ className, onImageSelect }: OutputBrowserProps) {
  const { sessionId } = useSessionStore();
  const [currentPath, setCurrentPath] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [images, setImages] = useState<OutputImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [sortReverse, setSortReverse] = useState(true);
  const [selectedImage, setSelectedImage] = useState<OutputImage | null>(null);
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load images from server
  const loadImages = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await listImages(
        {
          path: currentPath,
          depth: 1,
          sortBy,
          sortReverse,
        },
        sessionId
      );

      setFolders(response.folders || []);
      setImages(
        (response.files || []).map((f) => ({
          src: f.src,
          metadata: f.metadata,
        }))
      );
    } catch (error) {
      console.error("Failed to load images:", error);
      setFolders([]);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, currentPath, sortBy, sortReverse]);

  // Load on mount and when path/sort changes
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Navigate to folder
  const navigateToFolder = (folder: string) => {
    setCurrentPath(currentPath ? `${currentPath}/${folder}` : folder);
  };

  // Navigate up
  const navigateUp = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  // Filter images by search
  const filteredImages = searchQuery
    ? images.filter((img) =>
        img.src.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : images;

  // Open image in full view
  const openFullView = (image: OutputImage, index: number) => {
    setSelectedImage(image);
    setSelectedIndex(index);
    setFullViewOpen(true);
  };

  // Navigate between images in full view
  const navigateImage = (delta: number) => {
    const newIndex = selectedIndex + delta;
    if (newIndex >= 0 && newIndex < filteredImages.length) {
      setSelectedIndex(newIndex);
      setSelectedImage(filteredImages[newIndex]);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!fullViewOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigateImage(-1);
      if (e.key === "ArrowRight") navigateImage(1);
      if (e.key === "Escape") setFullViewOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullViewOpen, selectedIndex, filteredImages.length]);

  // Parse metadata
  const parseMetadata = (meta?: string | ImageMetadata): ImageMetadata | undefined => {
    if (!meta) return undefined;
    if (typeof meta === "string") {
      try {
        return JSON.parse(meta);
      } catch {
        return undefined;
      }
    }
    return meta;
  };

  // Download image
  const handleDownload = async (image: OutputImage) => {
    try {
      const response = await fetch(`/${image.src}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.src.split("/").pop() || "image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download:", error);
    }
  };

  // Copy metadata/prompt
  const handleCopyPrompt = (image: OutputImage) => {
    const metadata = parseMetadata(image.metadata);
    if (metadata?.prompt) {
      navigator.clipboard.writeText(String(metadata.prompt));
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        {/* Path navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={navigateUp}
            disabled={!currentPath}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
            /{currentPath || "Output"}
          </span>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "date")}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>

        {/* Refresh */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={loadImages}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Folders */}
          {folders.length > 0 && (
            <div className="space-y-1">
              {folders.map((folder) => (
                <Button
                  key={folder}
                  variant="ghost"
                  className="w-full justify-start h-9"
                  onClick={() => navigateToFolder(folder)}
                >
                  <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                  {folder}
                </Button>
              ))}
            </div>
          )}

          {/* Images grid */}
          {filteredImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredImages.map((image, idx) => {
                const metadata = parseMetadata(image.metadata);
                return (
                  <div
                    key={image.src}
                    className="group relative aspect-square rounded-md overflow-hidden bg-muted cursor-pointer"
                    onClick={() => {
                      if (onImageSelect) {
                        onImageSelect(image.src, metadata);
                      } else {
                        openFullView(image, idx);
                      }
                    }}
                  >
                    <img
                      src={`/${image.src}`}
                      alt={image.src}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openFullView(image, idx);
                        }}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && folders.length === 0 && images.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No images in this folder
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Full View Dialog */}
      <Dialog open={fullViewOpen} onOpenChange={setFullViewOpen}>
        <DialogContent className="!w-[90vw] !h-[90vh] !max-w-[90vw] !max-h-[90vh] !p-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Image Viewer</DialogTitle>
          </VisuallyHidden>
          {selectedImage && (
            <div className="flex flex-col lg:flex-row h-full">
              {/* Image */}
              <div className="flex-1 flex items-center justify-center bg-black/95 relative">
                <img
                  src={`/${selectedImage.src}`}
                  alt="Full view"
                  className="max-w-full max-h-[90vh] object-contain"
                />
                {/* Navigation arrows */}
                {selectedIndex > 0 && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    onClick={() => navigateImage(-1)}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
                {selectedIndex < filteredImages.length - 1 && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    onClick={() => navigateImage(1)}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}
              </div>

              {/* Metadata panel */}
              <div className="w-full lg:w-80 bg-background border-l flex flex-col shrink-0">
                <div className="p-4 border-b">
                  <h2 className="font-semibold">Image Details</h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedImage.src}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 p-4 border-b">
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
                    {(() => {
                      const metadata = parseMetadata(selectedImage.metadata);
                      if (!metadata) {
                        return (
                          <p className="text-muted-foreground">No metadata available</p>
                        );
                      }
                      return Object.entries(metadata).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <span className="font-medium text-muted-foreground capitalize text-xs">
                            {key}
                          </span>
                          <p className="break-words">{String(value)}</p>
                        </div>
                      ));
                    })()}
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
