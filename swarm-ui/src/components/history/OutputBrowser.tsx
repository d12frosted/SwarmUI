"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/session";
import { useParametersStore } from "@/stores/parameters";
import { useLoraStore } from "@/stores/loras";
import { listImages } from "@/lib/api";
import { extractConfigFromMetadata } from "@/lib/metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Search,
  Download,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Star,
  CalendarIcon,
  X,
  Grid3X3,
  Loader2,
  ArrowUpDown,
  RectangleHorizontal,
  RectangleVertical,
  Square,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ImageDetailsPanel } from "@/components/shared";
import type { ImageMetadata } from "@/types/api";

interface OutputImage {
  src: string;
  fullPath: string;
  metadata?: ImageMetadata;
  date?: Date;
}

interface OutputBrowserProps {
  className?: string;
  onImageSelect?: (src: string, metadata?: ImageMetadata) => void;
}

type ThumbnailSize = "small" | "medium" | "large" | "xl" | "xxl";

const sizeConfig: Record<ThumbnailSize, { cols: string }> = {
  small: { cols: "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10" },
  medium: { cols: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6" },
  large: { cols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" },
  xl: { cols: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" },
  xxl: { cols: "grid-cols-1 sm:grid-cols-1 md:grid-cols-2" },
};

const orientationConfig: Record<"landscape" | "portrait" | "square", string> = {
  landscape: "aspect-video",    // 16:9
  portrait: "aspect-[9/16]",    // 9:16
  square: "aspect-square",      // 1:1
};

export function OutputBrowser({ className, onImageSelect }: OutputBrowserProps) {
  const router = useRouter();
  const { sessionId } = useSessionStore();

  // Data state
  const [allImages, setAllImages] = useState<OutputImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");

  // View state
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>("medium");
  const [cardOrientation, setCardOrientation] = useState<"landscape" | "portrait" | "square">("square");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedLora, setSelectedLora] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Full view state
  const [selectedImage, setSelectedImage] = useState<OutputImage | null>(null);
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Parse metadata from string or object
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

  // Load all images recursively
  const loadAllImages = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setLoadingProgress("Loading images...");

    try {
      // Load with high depth to get all nested images
      const response = await listImages(
        {
          path: "",
          depth: 10, // High depth to get nested folders
          sortBy: "date",
          sortReverse: true,
          limit: 1000, // Reasonable limit
        },
        sessionId
      );

      // Process and flatten images
      const images: OutputImage[] = (response.files || []).map((f) => {
        const metadata = parseMetadata(f.metadata);
        // Try to extract date from metadata or filename
        let date: Date | undefined;
        if (metadata?.date) {
          date = new Date(metadata.date as string);
        } else {
          // Try to parse date from filename (common format: YYYY-MM-DD or timestamp)
          const dateMatch = f.src.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            date = new Date(dateMatch[1]);
          }
        }

        return {
          src: f.src.split("/").pop() || f.src, // Just the filename for display
          fullPath: f.src, // Full path for loading
          metadata,
          date,
        };
      });

      setAllImages(images);
      setLoadingProgress(`Loaded ${images.length} images`);
    } catch (error) {
      console.error("Failed to load images:", error);
      setLoadingProgress("Failed to load images");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Load on mount
  useEffect(() => {
    loadAllImages();
  }, [loadAllImages]);

  // Helper to extract params from nested or flat metadata
  const getParams = (meta?: ImageMetadata): Record<string, unknown> => {
    if (!meta) return {};
    return (meta.Sui_image_params || meta.sui_image_params || meta) as Record<string, unknown>;
  };

  // Extract unique models from all images for filter dropdown
  const availableModels = useMemo(() => {
    const models = new Set<string>();
    allImages.forEach((img) => {
      const params = getParams(img.metadata);
      const model = params.model || img.metadata?.model;
      if (model) {
        models.add(String(model));
      }
    });
    return Array.from(models).sort();
  }, [allImages]);

  // Extract unique LoRAs from all images for filter dropdown
  const availableLoras = useMemo(() => {
    const loras = new Set<string>();
    allImages.forEach((img) => {
      const params = getParams(img.metadata);
      const loraList = params.loras as string[] | undefined;
      if (loraList && Array.isArray(loraList)) {
        loraList.forEach((lora) => loras.add(lora));
      }
    });
    return Array.from(loras).sort();
  }, [allImages]);

  // Filter and sort images
  const filteredImages = useMemo(() => {
    // First filter
    const filtered = allImages.filter((img) => {
      const params = getParams(img.metadata);

      // Search filter - check filename and prompt
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesFilename = img.src.toLowerCase().includes(query);
        const prompt = String(params.prompt || img.metadata?.prompt || "");
        const negative = String(params.negativeprompt || img.metadata?.negativeprompt || "");
        const matchesPrompt = prompt.toLowerCase().includes(query);
        const matchesNegative = negative.toLowerCase().includes(query);
        if (!matchesFilename && !matchesPrompt && !matchesNegative) {
          return false;
        }
      }

      // Starred filter - check multiple locations
      if (starredOnly) {
        const extraData = (img.metadata?.Sui_extra_data || img.metadata?.sui_extra_data || {}) as Record<string, unknown>;
        const isStarred = img.metadata?.starred ||
                          extraData.starred ||
                          img.fullPath.toLowerCase().includes("starred");
        if (!isStarred) {
          return false;
        }
      }

      // Model filter
      if (selectedModel !== "all") {
        const model = String(params.model || img.metadata?.model || "");
        if (model !== selectedModel) {
          return false;
        }
      }

      // LoRA filter
      if (selectedLora !== "all") {
        const loraList = params.loras as string[] | undefined;
        if (!loraList || !Array.isArray(loraList) || !loraList.includes(selectedLora)) {
          return false;
        }
      }

      // Date range filter
      if (dateFrom && img.date && img.date < dateFrom) {
        return false;
      }
      if (dateTo && img.date && img.date > dateTo) {
        return false;
      }

      return true;
    });

    // Then sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        const dateA = a.date?.getTime() || 0;
        const dateB = b.date?.getTime() || 0;
        comparison = dateA - dateB;
        // Secondary sort by name when dates are equal
        if (comparison === 0) {
          comparison = a.src.localeCompare(b.src);
        }
      } else {
        comparison = a.src.localeCompare(b.src);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [allImages, searchQuery, starredOnly, selectedModel, selectedLora, dateFrom, dateTo, sortBy, sortOrder]);

  // Build image URL
  const getImageUrl = (fullPath: string) => `/Output/${fullPath}`;

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

  // Download image
  const handleDownload = async (image: OutputImage) => {
    try {
      const response = await fetch(getImageUrl(image.fullPath));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.src;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download:", error);
    }
  };

  // Use config from image and navigate to generate page
  const handleUseConfig = (image: OutputImage) => {
    if (image.metadata) {
      const config = extractConfigFromMetadata(image.metadata);
      useParametersStore.getState().setValues(config);
      // Sync LoRA UI from the updated parameters
      useLoraStore.getState().syncFromParams();
      // Navigate to generate page
      router.push("/generate");
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStarredOnly(false);
    setSelectedModel("all");
    setSelectedLora("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || starredOnly || selectedModel !== "all" || selectedLora !== "all" || dateFrom || dateTo;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Filter Bar */}
      <div className="space-y-2 p-3 border-b shrink-0">
        {/* Row 1: Search and Size */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts, filenames..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>

          {/* Thumbnail size */}
          <div className="flex items-center gap-0.5 border rounded-md p-1">
            <Grid3X3 className="h-4 w-4 text-muted-foreground mx-1" />
            {([
              { key: "small", label: "S" },
              { key: "medium", label: "M" },
              { key: "large", label: "L" },
              { key: "xl", label: "XL" },
              { key: "xxl", label: "XXL" },
            ] as { key: ThumbnailSize; label: string }[]).map(({ key, label }) => (
              <Button
                key={key}
                variant={thumbnailSize === key ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-1.5 text-xs"
                onClick={() => setThumbnailSize(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Card orientation */}
          <div className="flex items-center gap-0.5 border rounded-md p-1">
            {([
              { key: "landscape", icon: RectangleHorizontal, title: "Landscape" },
              { key: "square", icon: Square, title: "Square" },
              { key: "portrait", icon: RectangleVertical, title: "Portrait" },
            ] as { key: "landscape" | "portrait" | "square"; icon: typeof Square; title: string }[]).map(({ key, icon: Icon, title }) => (
              <Button
                key={key}
                variant={cardOrientation === key ? "secondary" : "ghost"}
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setCardOrientation(key)}
                title={title}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={loadAllImages}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Row 2: Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Starred toggle */}
          <Toggle
            pressed={starredOnly}
            onPressedChange={setStarredOnly}
            size="sm"
            className="h-8 px-2 data-[state=on]:bg-yellow-500/20 data-[state=on]:text-yellow-600"
          >
            <Star className={cn("h-4 w-4 mr-1", starredOnly && "fill-current")} />
            Starred
          </Toggle>

          {/* Model filter */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="h-8 w-[280px]">
              <SelectValue placeholder="All models" />
            </SelectTrigger>
            <SelectContent className="max-w-[400px]">
              <SelectItem value="all">All models</SelectItem>
              {availableModels.map((model) => (
                <SelectItem key={model} value={model} title={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* LoRA filter */}
          {availableLoras.length > 0 && (
            <Select value={selectedLora} onValueChange={setSelectedLora}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue placeholder="All LoRAs" />
              </SelectTrigger>
              <SelectContent className="max-w-[350px]">
                <SelectItem value="all">All LoRAs</SelectItem>
                {availableLoras.map((lora) => (
                  <SelectItem key={lora} value={lora} title={lora}>
                    {lora}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date from */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {dateFrom ? format(dateFrom, "MMM d") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Date to */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {dateTo ? format(dateTo, "MMM d") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(v) => {
              const [by, order] = v.split("-") as ["date" | "name", "asc" | "desc"];
              setSortBy(by);
              setSortOrder(order);
            }}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest first</SelectItem>
              <SelectItem value="date-asc">Oldest first</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}

          {/* Results count */}
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredImages.length} of {allImages.length} images
          </span>
        </div>
      </div>

      {/* Image Grid */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {isLoading && allImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>{loadingProgress}</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {hasActiveFilters ? "No images match your filters" : "No images found"}
            </div>
          ) : (
            <div className={cn("grid gap-2", sizeConfig[thumbnailSize].cols)}>
              {filteredImages.map((image, idx) => (
                <div
                  key={image.fullPath}
                  className={cn(
                    "group relative rounded-md overflow-hidden bg-muted cursor-pointer",
                    orientationConfig[cardOrientation]
                  )}
                  onClick={() => {
                    if (onImageSelect) {
                      onImageSelect(image.fullPath, image.metadata);
                    } else {
                      openFullView(image, idx);
                    }
                  }}
                >
                  {/* Image with aspect ratio preserved */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={getImageUrl(image.fullPath)}
                      alt={image.src}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* Starred indicator */}
                  {(() => {
                    const extraData = (image.metadata?.Sui_extra_data || image.metadata?.sui_extra_data || {}) as Record<string, unknown>;
                    const isStarred = image.metadata?.starred ||
                                      extraData.starred ||
                                      image.fullPath.toLowerCase().includes("starred");
                    return isStarred ? (
                      <div className="absolute top-1 right-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      </div>
                    ) : null;
                  })()}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
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
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(image);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
                  src={getImageUrl(selectedImage.fullPath)}
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
                {/* Image counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                  {selectedIndex + 1} / {filteredImages.length}
                </div>
              </div>

              {/* Metadata panel */}
              <div className="w-full lg:w-96 bg-background border-l flex flex-col shrink-0 max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b shrink-0">
                  <h2 className="font-semibold">Image Details</h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedImage.fullPath}
                  </p>
                </div>

                {/* Metadata panel */}
                <ImageDetailsPanel
                  metadata={selectedImage.metadata}
                  onDownload={() => handleDownload(selectedImage)}
                  onUseConfig={() => handleUseConfig(selectedImage)}
                  showActions={true}
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
