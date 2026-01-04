"use client";

import { useState, useEffect } from "react";
import { useLoraStore, CONFINEMENT_OPTIONS, type SelectedLora } from "@/stores/loras";
import { Button } from "@/components/ui/button";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { X } from "lucide-react";

interface SelectedLoraItemProps {
  lora: SelectedLora;
}

// Strip HTML tags and decode entities for clean text display
function stripHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, " ");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Collapse whitespace
  return text.replace(/\s+/g, " ").trim();
}

export function SelectedLoraItem({ lora }: SelectedLoraItemProps) {
  const { setWeight, setConfinement, deselectLora } = useLoraStore();

  // Local state for weight input to allow typing freely
  const [weightInput, setWeightInput] = useState(String(lora.weight ?? 1));

  // Sync local state when lora.weight changes externally (e.g., from slider)
  useEffect(() => {
    const currentValue = parseFloat(weightInput);
    if (currentValue !== lora.weight) {
      setWeightInput(String(lora.weight ?? 1));
    }
  }, [lora.weight]);

  const handleWeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWeightInput(e.target.value);
  };

  const handleWeightInputBlur = () => {
    const value = parseFloat(weightInput);
    if (!Number.isNaN(value)) {
      setWeight(lora.name, value);
    } else {
      // Reset to current weight if invalid
      setWeightInput(String(lora.weight ?? 1));
    }
  };

  const handleWeightInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  // Get display name (last part of path, without extension)
  const displayName = lora.name.includes("/")
    ? lora.name.substring(lora.name.lastIndexOf("/") + 1)
    : lora.name;

  return (
    <div className="flex flex-col gap-1 p-2 bg-muted/50 rounded-md">
      {/* Row 1: Name + Remove button */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm font-medium truncate flex-1">
                {displayName}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="font-medium">{lora.name}</p>
              {lora.model?.description && (
                <p className="text-muted-foreground text-xs mt-1">
                  {stripHtml(lora.model.description)}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Remove button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => deselectLora(lora.name)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Row 2: Weight slider + Confinement */}
      <div className="flex items-center gap-2">
        <Slider
          value={[Number.isNaN(lora.weight) ? 1 : lora.weight]}
          onValueChange={([v]) => setWeight(lora.name, v)}
          min={-2}
          max={2}
          step={0.05}
          className="flex-1"
        />
        <Input
          type="number"
          value={weightInput}
          onChange={handleWeightInputChange}
          onBlur={handleWeightInputBlur}
          onKeyDown={handleWeightInputKeyDown}
          className="w-[4.5rem] h-7 text-xs text-center"
          step={0.05}
          min={-2}
          max={2}
        />

        {/* Confinement selector */}
        <Select
          value={String(lora.confinement ?? 0)}
          defaultValue="0"
          onValueChange={(v) => setConfinement(lora.name, parseInt(v))}
        >
          <SelectTrigger className="w-[5.5rem] h-7 text-xs">
            <SelectValue>
              {CONFINEMENT_OPTIONS.find(o => o.value === (lora.confinement ?? 0))?.label ?? "Global"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CONFINEMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
