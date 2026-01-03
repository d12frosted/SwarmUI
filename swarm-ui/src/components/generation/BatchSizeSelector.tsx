"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const QUICK_SIZES = [1, 2, 4, 8, 16];

interface BatchSizeSelectorProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function BatchSizeSelector({ value, onChange, className }: BatchSizeSelectorProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium">Batch Size</Label>
      <div className="flex items-center gap-1">
        {QUICK_SIZES.map((size) => (
          <Button
            key={size}
            variant={value === size ? "default" : "outline"}
            size="sm"
            className="h-7 w-8 p-0 text-xs"
            onClick={() => onChange(size)}
          >
            {size}
          </Button>
        ))}
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 1)}
          min={1}
          max={100}
          className="w-14 h-7 text-xs text-center ml-1"
        />
      </div>
    </div>
  );
}
