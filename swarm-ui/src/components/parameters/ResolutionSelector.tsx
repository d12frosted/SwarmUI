"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
];

// Common side lengths (based on model capabilities)
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
  // Detect current aspect ratio from width/height
  const currentAspect = useMemo(() => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    const ratioW = width / divisor;
    const ratioH = height / divisor;

    // Find matching preset
    const match = ASPECT_RATIOS.find(
      (ar) =>
        (ar.width / ar.height).toFixed(3) === (ratioW / ratioH).toFixed(3)
    );

    return match?.value || "custom";
  }, [width, height]);

  // Calculate side length (longer side)
  const sideLength = Math.max(width, height);

  // Handle aspect ratio change
  const handleAspectChange = (value: string) => {
    const aspect = ASPECT_RATIOS.find((ar) => ar.value === value);
    if (!aspect) return;

    // Calculate new dimensions based on current side length
    const ratio = aspect.width / aspect.height;

    let newWidth: number;
    let newHeight: number;

    if (ratio >= 1) {
      // Landscape or square
      newWidth = sideLength;
      newHeight = Math.round(sideLength / ratio / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;
    } else {
      // Portrait
      newHeight = sideLength;
      newWidth = Math.round(sideLength * ratio / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;
    }

    // Clamp to valid range
    newWidth = Math.max(SIDE_LENGTH_MIN, Math.min(SIDE_LENGTH_MAX, newWidth));
    newHeight = Math.max(SIDE_LENGTH_MIN, Math.min(SIDE_LENGTH_MAX, newHeight));

    onWidthChange(newWidth);
    onHeightChange(newHeight);
  };

  // Handle side length change
  const handleSideLengthChange = (value: number[]) => {
    const newSideLength = value[0];
    const aspect = ASPECT_RATIOS.find((ar) => ar.value === currentAspect);

    if (!aspect || currentAspect === "custom") {
      // For custom, scale proportionally
      const scale = newSideLength / sideLength;
      const newWidth = Math.round((width * scale) / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;
      const newHeight = Math.round((height * scale) / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;
      onWidthChange(Math.max(SIDE_LENGTH_MIN, Math.min(SIDE_LENGTH_MAX, newWidth)));
      onHeightChange(Math.max(SIDE_LENGTH_MIN, Math.min(SIDE_LENGTH_MAX, newHeight)));
      return;
    }

    const ratio = aspect.width / aspect.height;

    let newWidth: number;
    let newHeight: number;

    if (ratio >= 1) {
      // Landscape or square - width is the longer side
      newWidth = newSideLength;
      newHeight = Math.round(newSideLength / ratio / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;
    } else {
      // Portrait - height is the longer side
      newHeight = newSideLength;
      newWidth = Math.round(newSideLength * ratio / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;
    }

    onWidthChange(Math.max(SIDE_LENGTH_MIN, newWidth));
    onHeightChange(Math.max(SIDE_LENGTH_MIN, newHeight));
  };

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
        <Select value={currentAspect} onValueChange={handleAspectChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASPECT_RATIOS.map((ar) => (
              <SelectItem key={ar.value} value={ar.value}>
                {ar.label}
              </SelectItem>
            ))}
            {currentAspect === "custom" && (
              <SelectItem value="custom">Custom ({width}×{height})</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Side Length Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm">Size</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Adjust the resolution (longer side)</p>
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
    </div>
  );
}
