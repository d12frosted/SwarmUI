"use client";

import { useRef, useEffect } from "react";
import { useFabricCanvas, type EditorTool } from "./useFabricCanvas";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  MousePointer2,
  Paintbrush,
  Eraser,
  Move,
  Undo2,
  Redo2,
  Trash2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageEditorProps {
  width?: number;
  height?: number;
  imageUrl?: string;
  onMaskExport?: (maskDataUrl: string) => void;
  onImageExport?: (imageDataUrl: string) => void;
  className?: string;
}

const TOOLS: { id: EditorTool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Select" },
  { id: "brush", icon: <Paintbrush className="h-4 w-4" />, label: "Brush" },
  { id: "eraser", icon: <Eraser className="h-4 w-4" />, label: "Eraser" },
  { id: "pan", icon: <Move className="h-4 w-4" />, label: "Pan" },
];

const BRUSH_COLORS = [
  "#ffffff", // White (default for mask)
  "#ff0000", // Red
  "#00ff00", // Green
  "#0000ff", // Blue
  "#ffff00", // Yellow
  "#ff00ff", // Magenta
  "#00ffff", // Cyan
];

export function ImageEditor({
  width = 512,
  height = 512,
  imageUrl,
  onMaskExport,
  onImageExport,
  className,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    canvas,
    isReady,
    tool,
    brushSize,
    brushColor,
    canUndo,
    canRedo,
    setTool,
    setBrushSize,
    setBrushColor,
    undo,
    redo,
    clear,
    loadImage,
    exportMask,
    exportImage,
  } = useFabricCanvas(canvasRef);

  // Load image when URL changes
  useEffect(() => {
    if (isReady && imageUrl) {
      loadImage(imageUrl);
    }
  }, [isReady, imageUrl, loadImage]);

  // Note: Dynamic resize disabled due to Fabric.js v6 initialization issues
  // Canvas uses fixed dimensions from props (width/height)

  const handleExportMask = () => {
    const mask = exportMask();
    if (mask) {
      onMaskExport?.(mask);
    }
  };

  const handleExportImage = () => {
    const image = exportImage();
    if (image) {
      onImageExport?.(image);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg flex-wrap">
        {/* Tool selection */}
        <TooltipProvider>
          <div className="flex items-center gap-1">
            {TOOLS.map((t) => (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={tool === t.id}
                    onPressedChange={() => setTool(t.id)}
                    size="sm"
                    aria-label={t.label}
                  >
                    {t.icon}
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        {/* Brush size */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <Label className="text-xs whitespace-nowrap">Size</Label>
          <Slider
            value={[brushSize]}
            onValueChange={([v]) => setBrushSize(v)}
            min={1}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs w-6 text-right">{brushSize}</span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {BRUSH_COLORS.map((color) => (
            <button
              key={color}
              className={cn(
                "w-6 h-6 rounded border-2 transition-all",
                brushColor === color
                  ? "border-primary scale-110"
                  : "border-transparent hover:border-muted-foreground/50"
              )}
              style={{ backgroundColor: color }}
              onClick={() => setBrushColor(color)}
              title={color}
            />
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={undo}
                  disabled={!canUndo}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={redo}
                  disabled={!canRedo}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo (Ctrl+Y)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        {/* Clear */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clear}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear drawing</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export */}
        {(onMaskExport || onImageExport) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMaskExport ? handleExportMask : handleExportImage}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{onMaskExport ? "Export as mask" : "Export image"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden fabric-canvas-container"
        style={{
          width: width,
          height: height,
          // Checkerboard pattern for transparency
          background: `
            #1a1a1a
            repeating-conic-gradient(#2a2a2a 0% 25%, transparent 0% 50%)
            50% / 20px 20px
          `,
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ display: 'block' }}
        />
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center">
        {tool === "brush" && "Left-click and drag to paint mask areas"}
        {tool === "eraser" && "Left-click and drag to erase"}
        {tool === "select" && "Click to select objects, drag to move"}
        {tool === "pan" && "Click and drag to pan the canvas"}
      </p>
    </div>
  );
}
