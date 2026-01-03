"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/session";
import { useStatusStore } from "@/stores/status";
import { useGenerationStore } from "@/stores/generation";
import { useParametersStore } from "@/stores/parameters";
import { WSClient } from "@/lib/websocket/client";
import { interruptAll } from "@/lib/api";
import { Play, Square, Loader2 } from "lucide-react";
import type { WSMessage, GeneratedImage, GenerationProgress } from "@/types/api";

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
    startGeneration,
    updateProgress,
    setPreviewImage,
    addGeneratedImage,
    completeGeneration,
    failGeneration,
    cancelGeneration,
  } = useGenerationStore();
  const { getGenerationInput } = useParametersStore();

  const handleGenerate = useCallback(async () => {
    if (!sessionId) return;

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

        // Handle generated images
        if (message.image) {
          const generatedImage: GeneratedImage = {
            image: message.image,
            metadata: input as any,
            batch_id: requestId,
          };
          addGeneratedImage(requestId, generatedImage);
          onImageGenerated?.(generatedImage);
        }

        // Handle multiple images
        if (message.images) {
          for (const img of message.images) {
            addGeneratedImage(requestId, img);
            onImageGenerated?.(img);
          }
        }

        // Handle errors
        if (message.error) {
          failGeneration(requestId, message.error);
          client.disconnect();
        }
      },
      onError: (error) => {
        failGeneration(requestId, error.message);
      },
      onStateChange: (state) => {
        if (state === "completed" || state === "disconnected") {
          if (useGenerationStore.getState().currentRequest?.id === requestId) {
            completeGeneration(requestId);
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
      {isGenerating ? (
        <Button
          variant="destructive"
          size="lg"
          className="w-full"
          onClick={handleInterrupt}
        >
          <Square className="mr-2 h-4 w-4" />
          Interrupt
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full"
          onClick={handleGenerate}
          disabled={!sessionId || waitingGens > 10}
        >
          <Play className="mr-2 h-4 w-4" />
          Generate
        </Button>
      )}

      {/* Progress indicator */}
      {isGenerating && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
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
    </div>
  );
}
