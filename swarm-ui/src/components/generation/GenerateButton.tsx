"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSessionStore } from "@/stores/session";
import { useStatusStore } from "@/stores/status";
import { useGenerationStore } from "@/stores/generation";
import { useParametersStore } from "@/stores/parameters";
import { WSClient } from "@/lib/websocket/client";
import { interruptAll } from "@/lib/api";
import { Play, Square, AlertCircle, Infinity } from "lucide-react";
import type { WSMessage, GeneratedImage, GenerationProgress, ImageMetadata } from "@/types/api";

interface GenerateButtonProps {
  onImageGenerated?: (image: GeneratedImage) => void;
  onProgress?: (progress: GenerationProgress) => void;
}

export function GenerateButton({ onImageGenerated, onProgress }: GenerateButtonProps) {
  const { sessionId } = useSessionStore();
  const { waitingGens, liveGens } = useStatusStore();
  const {
    isGenerating,
    currentRequest,
    isGeneratingForever,
    startGeneration,
    updateProgress,
    setPreviewImage,
    addGeneratedImage,
    completeGeneration,
    failGeneration,
    cancelGeneration,
    setGeneratingForever,
  } = useGenerationStore();
  const { getGenerationInput } = useParametersStore();
  const [lastError, setLastError] = useState<string | null>(null);
  const generateForeverRef = useRef(false);

  // Keep ref in sync with store
  useEffect(() => {
    generateForeverRef.current = isGeneratingForever;
  }, [isGeneratingForever]);

  // Clear error after 10 seconds
  useEffect(() => {
    if (lastError) {
      const timer = setTimeout(() => setLastError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [lastError]);

  const handleGenerate = useCallback(async () => {
    if (!sessionId) return;

    // Clear previous error
    setLastError(null);

    // Get generation parameters
    const input = getGenerationInput();

    // Start generation in store
    const requestId = startGeneration(input);

    // Create WebSocket connection
    const client = new WSClient("GenerateText2ImageWS", {
      sessionId,
      onMessage: (data) => {
        const message = data as WSMessage;

        // Handle progress updates
        if (message.gen_progress) {
          updateProgress(requestId, message.gen_progress);
          onProgress?.(message.gen_progress);
        }

        // Handle preview image
        if (message.gen_progress?.preview) {
          setPreviewImage(requestId, message.gen_progress.preview);
        }

        // Handle generated images - image field can be object {image, batch_index, metadata} or string
        if (message.image) {
          console.log("[Gen] Final image message:", JSON.stringify(message.image, null, 2));

          // Handle both object and string formats
          const imgData = message.image;
          const imageUrl = typeof imgData === 'string'
            ? imgData
            : (imgData as { image?: string }).image;

          if (!imageUrl) {
            console.warn("[Gen] No image URL found in message:", message.image);
            return;
          }

          // Parse metadata if available - check both message.metadata and imgData.metadata
          let metadata: Record<string, unknown> = {};
          const rawMetadata = (message as Record<string, unknown>).metadata ||
                              (typeof imgData === 'object' ? imgData.metadata : null);
          if (rawMetadata) {
            try {
              metadata = typeof rawMetadata === 'string' ? JSON.parse(rawMetadata) : rawMetadata;
            } catch {
              metadata = { raw: rawMetadata };
            }
          }
          // Fallback to input params if no metadata from backend
          if (Object.keys(metadata).length === 0) {
            metadata = { ...input };
          }

          // Backend returns URLs like "/Output/..." - use as-is if starting with / or data:
          const finalUrl = imageUrl.startsWith("data:") || imageUrl.startsWith("/")
            ? imageUrl
            : `/${imageUrl}`;

          console.log("[Gen] Image URL - raw:", imageUrl, "final:", finalUrl);

          const generatedImage: GeneratedImage = {
            image: finalUrl,
            metadata: metadata as ImageMetadata,
            batch_id: requestId,
          };
          addGeneratedImage(requestId, generatedImage);
          onImageGenerated?.(generatedImage);
        }

        // Handle multiple images
        if (message.images && Array.isArray(message.images)) {
          for (const imgData of message.images) {
            const imageUrl = typeof imgData === 'string'
              ? imgData
              : (imgData as { image?: string }).image;

            if (!imageUrl) continue;

            // Parse metadata if available
            let metadata: Record<string, unknown> = {};
            const rawMetadata = typeof imgData === 'object' ? imgData.metadata : null;
            if (rawMetadata) {
              try {
                metadata = typeof rawMetadata === 'string' ? JSON.parse(rawMetadata) : rawMetadata;
              } catch {
                metadata = { raw: rawMetadata };
              }
            }
            // Fallback to input params if no metadata from backend
            if (Object.keys(metadata).length === 0) {
              metadata = { ...input };
            }

            // Backend returns URLs like "/Output/..." - use as-is if starting with / or data:
            const finalUrl = imageUrl.startsWith("data:") || imageUrl.startsWith("/")
              ? imageUrl
              : `/${imageUrl}`;

            const generatedImage: GeneratedImage = {
              image: finalUrl,
              metadata: metadata as ImageMetadata,
              batch_id: requestId,
            };
            addGeneratedImage(requestId, generatedImage);
            onImageGenerated?.(generatedImage);
          }
        }

        // Handle errors
        if (message.error) {
          setLastError(message.error);
          failGeneration(requestId, message.error);
          client.disconnect();
        }
      },
      onError: (error) => {
        setLastError(error.message);
        failGeneration(requestId, error.message);
      },
      onStateChange: (state) => {
        if (state === "completed" || state === "disconnected") {
          if (useGenerationStore.getState().currentRequest?.id === requestId) {
            completeGeneration(requestId);
            // If generate forever is enabled, start a new generation
            if (generateForeverRef.current) {
              setTimeout(() => {
                handleGenerate();
              }, 100);
            }
          }
        }
      },
    });

    try {
      await client.connect(input);
    } catch (error) {
      failGeneration(
        requestId,
        error instanceof Error ? error.message : "Failed to connect"
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionId,
    getGenerationInput,
    startGeneration,
    updateProgress,
    setPreviewImage,
    addGeneratedImage,
    completeGeneration,
    failGeneration,
    onImageGenerated,
    onProgress,
  ]);

  const handleInterrupt = useCallback(async () => {
    if (!sessionId) return;

    try {
      await interruptAll(sessionId);
      cancelGeneration();
    } catch (error) {
      console.error("Failed to interrupt:", error);
    }
  }, [sessionId, cancelGeneration]);

  const progress = currentRequest?.progress;
  const progressPercent = progress
    ? Math.round(progress.overall_percent * 100)
    : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {isGenerating ? (
          <Button
            variant="destructive"
            size="lg"
            className="flex-1"
            onClick={handleInterrupt}
          >
            <Square className="mr-2 h-4 w-4" />
            {isGeneratingForever ? "Stop Forever" : "Interrupt"}
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1"
            onClick={handleGenerate}
            disabled={!sessionId || waitingGens > 10}
          >
            <Play className="mr-2 h-4 w-4" />
            Generate
          </Button>
        )}

        {/* Generate Forever Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={isGeneratingForever}
                onPressedChange={setGeneratingForever}
                size="lg"
                className="shrink-0"
                aria-label="Generate forever"
              >
                <Infinity className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              <p>Generate Forever: {isGeneratingForever ? "ON" : "OFF"}</p>
              <p className="text-xs text-muted-foreground">
                Continuously generate images until stopped
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Progress indicator */}
      {isGenerating && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              {isGeneratingForever && (
                <Infinity className="h-3 w-3 text-primary animate-pulse" />
              )}
              {progress?.batch_index !== undefined
                ? `Image ${progress.batch_index + 1}`
                : "Generating..."}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue indicator */}
      {(waitingGens > 0 || liveGens > 0) && !isGenerating && (
        <p className="text-xs text-muted-foreground text-center">
          Queue: {waitingGens} waiting, {liveGens} generating
        </p>
      )}

      {/* Error display */}
      {lastError && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{lastError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
