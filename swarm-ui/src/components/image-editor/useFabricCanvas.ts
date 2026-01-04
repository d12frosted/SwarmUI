"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, PencilBrush, FabricObject } from "fabric";

export type EditorTool = "select" | "brush" | "eraser" | "pan";

export interface CanvasState {
  canvas: Canvas | null;
  isReady: boolean;
  tool: EditorTool;
  brushSize: number;
  brushColor: string;
  brushOpacity: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface CanvasActions {
  setTool: (tool: EditorTool) => void;
  setBrushSize: (size: number) => void;
  setBrushColor: (color: string) => void;
  setBrushOpacity: (opacity: number) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  loadImage: (url: string) => Promise<void>;
  exportMask: () => string | null;
  exportImage: () => string | null;
}

interface HistoryState {
  past: string[];
  future: string[];
}

const MAX_HISTORY = 50;

export function useFabricCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
): CanvasState & CanvasActions {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [tool, setToolState] = useState<EditorTool>("brush");
  const [brushSize, setBrushSizeState] = useState(20);
  const [brushColor, setBrushColorState] = useState("#ffffff");
  const [brushOpacity, setBrushOpacityState] = useState(1);

  const historyRef = useRef<HistoryState>({ past: [], future: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isLoadingRef = useRef(false);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return;

    const fabricCanvas = new Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: "transparent",
      selection: true,
    });

    // Set up brush
    const brush = new PencilBrush(fabricCanvas);
    brush.width = brushSize;
    brush.color = brushColor;
    fabricCanvas.freeDrawingBrush = brush;

    // Save initial state
    historyRef.current.past = [JSON.stringify(fabricCanvas.toJSON())];

    setCanvas(fabricCanvas);
    setIsReady(true);

    return () => {
      fabricCanvas.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef.current]);

  // Save state to history after drawing
  useEffect(() => {
    if (!canvas) return;

    const saveState = () => {
      if (isLoadingRef.current) return;

      const state = JSON.stringify(canvas.toJSON());
      const history = historyRef.current;

      // Don't save if same as last state
      if (history.past[history.past.length - 1] === state) return;

      history.past.push(state);
      if (history.past.length > MAX_HISTORY) {
        history.past.shift();
      }
      history.future = [];

      setCanUndo(history.past.length > 1);
      setCanRedo(false);
    };

    canvas.on("path:created", saveState);
    canvas.on("object:modified", saveState);
    canvas.on("object:removed", saveState);

    return () => {
      canvas.off("path:created", saveState);
      canvas.off("object:modified", saveState);
      canvas.off("object:removed", saveState);
    };
  }, [canvas]);

  // Update brush when settings change
  useEffect(() => {
    if (!canvas?.freeDrawingBrush) return;

    const brush = canvas.freeDrawingBrush;
    brush.width = brushSize;
    brush.color = tool === "eraser" ? "#000000" : brushColor;
    // Apply opacity to the color
    if (brushOpacity < 1) {
      const hex = tool === "eraser" ? "#000000" : brushColor;
      const alpha = Math.round(brushOpacity * 255).toString(16).padStart(2, "0");
      brush.color = hex + alpha;
    }
  }, [canvas, brushSize, brushColor, brushOpacity, tool]);

  // Update drawing mode based on tool
  useEffect(() => {
    if (!canvas) return;

    switch (tool) {
      case "select":
        canvas.isDrawingMode = false;
        canvas.selection = true;
        break;
      case "brush":
      case "eraser":
        canvas.isDrawingMode = true;
        canvas.selection = false;
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = tool === "eraser" ? "#000000" : brushColor;
        }
        break;
      case "pan":
        canvas.isDrawingMode = false;
        canvas.selection = false;
        break;
    }
  }, [canvas, tool, brushColor]);

  const setTool = useCallback((newTool: EditorTool) => {
    setToolState(newTool);
  }, []);

  const setBrushSize = useCallback((size: number) => {
    setBrushSizeState(size);
  }, []);

  const setBrushColor = useCallback((color: string) => {
    setBrushColorState(color);
  }, []);

  const setBrushOpacity = useCallback((opacity: number) => {
    setBrushOpacityState(opacity);
  }, []);

  const undo = useCallback(() => {
    if (!canvas) return;

    const history = historyRef.current;
    if (history.past.length <= 1) return;

    const current = history.past.pop()!;
    history.future.push(current);

    const previous = history.past[history.past.length - 1];
    isLoadingRef.current = true;
    canvas.loadFromJSON(JSON.parse(previous)).then(() => {
      canvas.renderAll();
      isLoadingRef.current = false;
      setCanUndo(history.past.length > 1);
      setCanRedo(history.future.length > 0);
    });
  }, [canvas]);

  const redo = useCallback(() => {
    if (!canvas) return;

    const history = historyRef.current;
    if (history.future.length === 0) return;

    const next = history.future.pop()!;
    history.past.push(next);

    isLoadingRef.current = true;
    canvas.loadFromJSON(JSON.parse(next)).then(() => {
      canvas.renderAll();
      isLoadingRef.current = false;
      setCanUndo(history.past.length > 1);
      setCanRedo(history.future.length > 0);
    });
  }, [canvas]);

  const clear = useCallback(() => {
    if (!canvas) return;

    // Remove all objects except background image
    const objects = canvas.getObjects();
    objects.forEach((obj: FabricObject) => {
      if (obj.type !== "image") {
        canvas.remove(obj);
      }
    });
    canvas.renderAll();

    // Save state
    const state = JSON.stringify(canvas.toJSON());
    historyRef.current.past.push(state);
    historyRef.current.future = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [canvas]);

  const loadImage = useCallback(async (url: string) => {
    if (!canvas) return;

    isLoadingRef.current = true;

    try {
      // Load image using fabric's built-in method
      const { FabricImage } = await import("fabric");
      const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });

      // Clear canvas
      canvas.clear();

      // Scale image to fit canvas while maintaining aspect ratio
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const imgWidth = img.width || canvasWidth;
      const imgHeight = img.height || canvasHeight;

      const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
      img.scale(scale);

      // Center the image
      img.set({
        left: (canvasWidth - imgWidth * scale) / 2,
        top: (canvasHeight - imgHeight * scale) / 2,
        selectable: false,
        evented: false,
      });

      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();

      // Reset history
      historyRef.current = {
        past: [JSON.stringify(canvas.toJSON())],
        future: [],
      };
      setCanUndo(false);
      setCanRedo(false);
    } finally {
      isLoadingRef.current = false;
    }
  }, [canvas]);

  const exportMask = useCallback(() => {
    if (!canvas) return null;

    // Create a temporary canvas for mask export
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.getWidth();
    tempCanvas.height = canvas.getHeight();
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return null;

    // Fill with black (masked areas)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw white where brush strokes are (unmasked areas)
    const objects = canvas.getObjects();
    objects.forEach((obj: FabricObject) => {
      if (obj.type === "path") {
        // This is a brush stroke - render it white
        const pathCanvas = document.createElement("canvas");
        pathCanvas.width = tempCanvas.width;
        pathCanvas.height = tempCanvas.height;
        const pathCtx = pathCanvas.getContext("2d");
        if (pathCtx) {
          // Render the path
          obj.render(pathCtx);
          ctx.globalCompositeOperation = "source-over";
          ctx.drawImage(pathCanvas, 0, 0);
        }
      }
    });

    return tempCanvas.toDataURL("image/png");
  }, [canvas]);

  const exportImage = useCallback(() => {
    if (!canvas) return null;
    return canvas.toDataURL({ format: "png", multiplier: 1 });
  }, [canvas]);

  return {
    canvas,
    isReady,
    tool,
    brushSize,
    brushColor,
    brushOpacity,
    canUndo,
    canRedo,
    setTool,
    setBrushSize,
    setBrushColor,
    setBrushOpacity,
    undo,
    redo,
    clear,
    loadImage,
    exportMask,
    exportImage,
  };
}
