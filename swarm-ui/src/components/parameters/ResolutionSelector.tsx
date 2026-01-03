"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

// Common aspect ratios
const ASPECT_RATIOS = [
  { label: "1:1 (Square)", value: "1:1", width: 1, height: 1 },
  { label: "4:3 (Standard)", value: "4:3", width: 4, height: 3 },
  { label: "3:4 (Portrait)", value: "3:4", width: 3, height: 4 },
  { label: "16:9 (Wide)", value: "16:9", width: 16, height: 9 },
  { label: "9:16 (Tall)", value: "9:16", width: 9, height: 16 },
  { label: "3:2 (Photo)", value: "3:2", width: 3, height: 2 },
  { label: "2:3 (Portrait Photo)", value: "2:3", width: 2, height: 3 },
  { label: "21:9 (Ultrawide)", value: "21:9", width: 21, height: 9 },
  { label: "Custom", value: "custom", width: 0, height: 0 },
];

const SIDE_LENGTH_MIN = 256;
const SIDE_LENGTH_MAX = 4096;
const SIDE_LENGTH_STEP = 64;

interface ResolutionSelectorProps {
  width: number;
  height: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
}

export function ResolutionSelector({
  width,
  height,
  onWidthChange,
  onHeightChange,
}: ResolutionSelectorProps) {
  // Track selected aspect ratio (user's choice, not detected)
  const [selectedAspect, setSelectedAspect] = useState<string>("1:1");

  // Initialize aspect ratio based on current dimensions
  useEffect(() => {
    const ratio = width / height;
    const match = ASPECT_RATIOS.find(
      (ar) => ar.value !== "custom" && Math.abs(ar.width / ar.height - ratio) < 0.01
    );
    if (match) {
      setSelectedAspect(match.value);
    } else {
      setSelectedAspect("custom");
    }
  }, []); // Only on mount

  // Calculate side length (longer side)
  const sideLength = Math.max(width, height);

  // Handle aspect ratio change
  const handleAspectChange = (value: string) => {
    setSelectedAspect(value);

    if (value === "custom") return; // Don't change dimensions for custom

    const aspect = ASPECT_RATIOS.find((ar) => ar.value === value);
    if (!aspect) return;

    const ratio = aspect.width / aspect.height;
    let newWidth: number;
    let newHeight: number;

    if (ratio >= 1) {
      newWidth = sideLength;
      newHeight = Math.round(sideLength / ratio / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;
    } else {
      newHeight = sideLength;
      newWidth = Math.round(sideLength * ratio / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;
    }

    newWidth = Math.max(SIDE_LENGTH_MIN, Math.min(SIDE_LENGTH_MAX, newWidth));
    newHeight = Math.max(SIDE_LENGTH_MIN, Math.min(SIDE_LENGTH_MAX, newHeight));

    onWidthChange(newWidth);
    onHeightChange(newHeight);
  };

  // Handle side length change (for preset aspects)
  const handleSideLengthChange = (value: number[]) => {
    const newSideLength = value[0];
    const aspect = ASPECT_RATIOS.find((ar) => ar.value === selectedAspect);

    if (!aspect || selectedAspect === "custom") return;

    const ratio = aspect.width / aspect.height;
    let newWidth: number;
    let newHeight: number;

    if (ratio >= 1) {
      newWidth = newSideLength;
      newHeight = Math.round(newSideLength / ratio / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;
    } else {
      newHeight = newSideLength;
      newWidth = Math.round(newSideLength * ratio / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;
    }

    onWidthChange(Math.max(SIDE_LENGTH_MIN, newWidth));
    onHeightChange(Math.max(SIDE_LENGTH_MIN, newHeight));
  };

  // Handle custom width/height input
  const handleCustomWidth = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= SIDE_LENGTH_MIN && num <= SIDE_LENGTH_MAX) {
      onWidthChange(Math.round(num / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP);
    }
  };

  const handleCustomHeight = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= SIDE_LENGTH_MIN && num <= SIDE_LENGTH_MAX) {
      onHeightChange(Math.round(num / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP);
    }
  };

  const isCustom = selectedAspect === "custom";

  return (
    <div className="space-y-3">
      {/* Aspect Ratio */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">Aspect Ratio</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Select the image proportions</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Select value={selectedAspect} onValueChange={handleAspectChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASPECT_RATIOS.map((ar) => (
              <SelectItem key={ar.value} value={ar.value}>
                {ar.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isCustom ? (
        /* Custom: Show Width & Height inputs */
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Width</Label>
            <Input
              type="number"
              value={width}
              onChange={(e) => handleCustomWidth(e.target.value)}
              min={SIDE_LENGTH_MIN}
              max={SIDE_LENGTH_MAX}
              step={SIDE_LENGTH_STEP}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Height</Label>
            <Input
              type="number"
              value={height}
              onChange={(e) => handleCustomHeight(e.target.value)}
              min={SIDE_LENGTH_MIN}
              max={SIDE_LENGTH_MAX}
              step={SIDE_LENGTH_STEP}
              className="h-8"
            />
          </div>
        </div>
      ) : (
        /* Preset: Show Size slider */
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm">Size</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adjust the resolution</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm text-muted-foreground">
              {width}×{height}
            </span>
          </div>
          <Slider
            value={[sideLength]}
            onValueChange={handleSideLengthChange}
            min={SIDE_LENGTH_MIN}
            max={SIDE_LENGTH_MAX}
            step={SIDE_LENGTH_STEP}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
