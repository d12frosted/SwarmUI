"use client";

import { useState, useEffect, useMemo } from "react";
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

// Pre-compute valid resolution pairs for an aspect ratio
// Each width maps to exactly one height (the closest valid one)
function computeValidResolutions(aspectW: number, aspectH: number): [number, number][] {
  const resolutions: [number, number][] = [];
  const targetRatio = aspectW / aspectH;

  // Iterate through all possible widths
  for (let w = SIDE_LENGTH_MIN; w <= SIDE_LENGTH_MAX; w += SIDE_LENGTH_STEP) {
    // Compute ideal height for this width to match target ratio
    const idealH = w / targetRatio;

    // Round to nearest step
    const h = Math.round(idealH / SIDE_LENGTH_STEP) * SIDE_LENGTH_STEP;

    // Check height bounds
    if (h < SIDE_LENGTH_MIN || h > SIDE_LENGTH_MAX) continue;

    resolutions.push([w, h]);
  }

  // Sort by total pixels (area)
  resolutions.sort((a, b) => (a[0] * a[1]) - (b[0] * b[1]));

  return resolutions;
}

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

  // Pre-compute valid resolutions for the selected aspect ratio
  const validResolutions = useMemo(() => {
    const aspect = ASPECT_RATIOS.find((ar) => ar.value === selectedAspect);
    if (!aspect || selectedAspect === "custom") return [];
    return computeValidResolutions(aspect.width, aspect.height);
  }, [selectedAspect]);

  // Find the current resolution index in validResolutions
  const currentIndex = useMemo(() => {
    if (validResolutions.length === 0) return 0;
    const idx = validResolutions.findIndex(([w, h]) => w === width && h === height);
    if (idx !== -1) return idx;
    // Find closest by area
    const currentArea = width * height;
    let closest = 0;
    let closestDiff = Infinity;
    validResolutions.forEach(([w, h], i) => {
      const diff = Math.abs(w * h - currentArea);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = i;
      }
    });
    return closest;
  }, [validResolutions, width, height]);

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

  // Handle aspect ratio change
  const handleAspectChange = (value: string) => {
    setSelectedAspect(value);

    if (value === "custom") return; // Don't change dimensions for custom

    const aspect = ASPECT_RATIOS.find((ar) => ar.value === value);
    if (!aspect) return;

    // Get valid resolutions for new aspect
    const resolutions = computeValidResolutions(aspect.width, aspect.height);
    if (resolutions.length === 0) return;

    // Find resolution closest to current area
    const currentArea = width * height;
    let closest = resolutions[0];
    let closestDiff = Infinity;
    for (const [w, h] of resolutions) {
      const diff = Math.abs(w * h - currentArea);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = [w, h];
      }
    }

    onWidthChange(closest[0]);
    onHeightChange(closest[1]);
  };

  // Handle slider change - select from valid resolutions by index
  const handleSliderChange = (value: number[]) => {
    const index = value[0];
    if (index < 0 || index >= validResolutions.length) return;
    const [w, h] = validResolutions[index];
    onWidthChange(w);
    onHeightChange(h);
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
                  <p>Select from valid resolutions for this aspect ratio</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm text-muted-foreground">
              {width}×{height}
            </span>
          </div>
          <Slider
            value={[currentIndex]}
            onValueChange={handleSliderChange}
            min={0}
            max={Math.max(0, validResolutions.length - 1)}
            step={1}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
