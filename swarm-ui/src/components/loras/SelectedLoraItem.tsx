"use client";

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

export function SelectedLoraItem({ lora }: SelectedLoraItemProps) {
  const { setWeight, setConfinement, deselectLora } = useLoraStore();

  // Get display name (last part of path, without extension)
  const displayName = lora.name.includes("/")
    ? lora.name.substring(lora.name.lastIndexOf("/") + 1)
    : lora.name;

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
      {/* Name */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm font-medium truncate max-w-[120px]">
              {displayName}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{lora.name}</p>
            {lora.model?.description && (
              <p className="text-muted-foreground max-w-xs">
                {lora.model.description}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Weight slider */}
      <div className="flex items-center gap-1 flex-1 min-w-[100px]">
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
          value={Number.isNaN(lora.weight) ? 1 : lora.weight}
          onChange={(e) => setWeight(lora.name, parseFloat(e.target.value) || 1)}
          className="w-14 h-7 text-xs text-center"
          step={0.05}
          min={-2}
          max={2}
        />
      </div>

      {/* Confinement selector */}
      <Select
        value={String(lora.confinement)}
        onValueChange={(v) => setConfinement(lora.name, parseInt(v))}
      >
        <SelectTrigger className="w-20 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONFINEMENT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
  );
}
