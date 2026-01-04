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
  const isInitializedRef = useRef(false);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || canvas || isInitializedRef.current) return;

    const canvasElement = canvasRef.current;

    // Ensure the canvas element is in the DOM
    if (!canvasElement.parentElement) {
      console.log("[ImageEditor] Canvas not yet in DOM, waiting...");
      return;
    }

    // Check if canvas already has Fabric attached (data-fabric attribute)
    if (canvasElement.getAttribute('data-fabric')) {
      console.log("[ImageEditor] Canvas already initialized by Fabric");
      return;
    }

    // Get dimensions from the canvas element
    const width = canvasElement.width || 512;
    const height = canvasElement.height || 512;

    console.log("[ImageEditor] Initializing Fabric canvas:", width, "x", height);

    // Mark as initializing to prevent double initialization
    isInitializedRef.current = true;

    // Wait for next frame to ensure DOM is fully rendered
    let fabricCanvas: Canvas | null = null;
    let cancelled = false;

    const rafId1 = requestAnimationFrame(() => {
      if (cancelled) return;
      const rafId2 = requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          fabricCanvas = new Canvas(canvasElement, {
            isDrawingMode: true,
            backgroundColor: "transparent",
            selection: true,
            width,
            height,
          });

          console.log("[ImageEditor] Fabric canvas created");

          // Set up brush
          const brush = new PencilBrush(fabricCanvas);
          brush.width = brushSize;
          brush.color = brushColor;
          fabricCanvas.freeDrawingBrush = brush;

          // Save initial state
          historyRef.current.past = [JSON.stringify(fabricCanvas.toJSON())];

          setCanvas(fabricCanvas);
          setIsReady(true);
        } catch (err) {
          console.error("[ImageEditor] Failed to initialize canvas:", err);
          isInitializedRef.current = false;
        }
      });
    });

    return () => {
      cancelled = true;
      if (fabricCanvas) {
        fabricCanvas.dispose();
        isInitializedRef.current = false;
      }
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
    if (!canvas) {
      console.log("[ImageEditor] No canvas");
      return;
    }

    isLoadingRef.current = true;

    // Small delay to ensure canvas is fully mounted
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const { FabricImage } = await import("fabric");

      // Clear canvas - remove all objects first
      const objects = canvas.getObjects();
      objects.forEach(obj => canvas.remove(obj));

      // Scale image to fit canvas while maintaining aspect ratio
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();

      // Use Fabric's fromURL with correct v6 signature
      const img = await FabricImage.fromURL(
        url,
        { crossOrigin: "anonymous" }
      );

      const imgWidth = img.width || canvasWidth;
      const imgHeight = img.height || canvasHeight;

      const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);

      // Center the image
      const left = (canvasWidth - imgWidth * scale) / 2;
      const top = (canvasHeight - imgHeight * scale) / 2;

      img.set({
        left,
        top,
        scaleX: scale,
        scaleY: scale,
        originX: 'left',
        originY: 'top',
      });

      // Add as regular object (will be sent to back)
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.requestRenderAll();

      // Reset history
      historyRef.current = {
        past: [JSON.stringify(canvas.toJSON())],
        future: [],
      };
      setCanUndo(false);
      setCanRedo(false);
    } catch (e) {
      console.error("[ImageEditor] Failed to load image:", e);
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
