"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, MoreVertical, Play, Copy, Pencil, Trash2 } from "lucide-react";
import type { Preset } from "@/lib/api";

interface PresetCardProps {
  preset: Preset;
  isActive: boolean;
  onToggle: () => void;
  onApply: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function PresetCard({
  preset,
  isActive,
  onToggle,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
}: PresetCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Get display name (last part of path)
  const displayName = preset.title.includes("/")
    ? preset.title.substring(preset.title.lastIndexOf("/") + 1)
    : preset.title;

  // Format param list for tooltip
  const paramList = Object.entries(preset.param_map)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const handleDelete = () => {
    if (showConfirmDelete) {
      onDelete();
      setShowConfirmDelete(false);
    } else {
      setShowConfirmDelete(true);
      // Reset after 3 seconds
      setTimeout(() => setShowConfirmDelete(false), 3000);
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
        isActive ? "ring-2 ring-primary bg-primary/5" : ""
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-2">
        <div className="flex items-start gap-2">
          {/* Preview image or placeholder */}
          <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-muted">
            {preset.preview_image && preset.preview_image !== "imgs/model_placeholder.jpg" ? (
              <img
                src={preset.preview_image}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                No img
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h4 className="font-medium text-sm truncate">{displayName}</h4>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium">{preset.title}</p>
                  {preset.description && (
                    <p className="text-muted-foreground mt-1">{preset.description}</p>
                  )}
                  <pre className="text-xs mt-2 whitespace-pre-wrap">{paramList}</pre>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground truncate">
              {Object.keys(preset.param_map).length} params
            </p>
          </div>

          {/* Active indicator */}
          {isActive && (
            <div className="shrink-0">
              <Check className="h-4 w-4 text-primary" />
            </div>
          )}

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApply(); }}>
                <Play className="h-4 w-4 mr-2" />
                Apply Now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                className={showConfirmDelete ? "text-destructive" : ""}
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {showConfirmDelete ? "Click to confirm" : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
