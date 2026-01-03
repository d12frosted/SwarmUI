"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Upload, X, Clipboard } from "lucide-react";

interface ImageInputProps {
  id: string;
  label: string;
  description?: string;
  value?: string; // base64 data URL or empty
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ImageInput({
  id,
  label,
  description,
  value,
  onChange,
  disabled = false,
}: ImageInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Convert file to base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle file selection
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      console.warn("Not an image file:", file.type);
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      onChange(base64);
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  }, [fileToBase64, onChange]);

  // File input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }, [handleFile]);

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  // Paste handler (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle paste if this component's drop zone is focused or hovered
      const dropZone = dropZoneRef.current;
      if (!dropZone) return;

      // Check if paste target is within our component or document body (global paste)
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
          }
          break;
        }
      }
    };

    // Add paste listener to the drop zone element
    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener("paste", handlePaste);
      return () => dropZone.removeEventListener("paste", handlePaste);
    }
  }, [handleFile]);

  // Clear image
  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  // Click to select file
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const hasImage = Boolean(value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {hasImage ? (
        // Image preview
        <div className="relative group">
          <img
            src={value}
            alt={label}
            className="w-full h-32 object-contain rounded-md border bg-muted/30"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        // Drop zone
        <div
          ref={dropZoneRef}
          tabIndex={0}
          className={`
            flex flex-col items-center justify-center gap-2 p-4
            border-2 border-dashed rounded-md cursor-pointer
            transition-colors focus:outline-none focus:ring-2 focus:ring-ring
            ${isDragging
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          onClick={disabled ? undefined : handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <div className="text-xs text-muted-foreground text-center">
            <span className="font-medium">Click to upload</span>
            <span className="block">or drag & drop</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
            <Clipboard className="h-3 w-3" />
            <span>Ctrl+V to paste</span>
          </div>
        </div>
      )}
    </div>
  );
}
