"use client";

import { create } from "zustand";
import type { GeneratedImage, GenerationProgress, ActiveGeneration, ImageMetadata } from "@/types/api";
import { getActiveGenerations, listImages } from "@/lib/api";

export interface GenerationRequest {
  id: string;
  params: Record<string, unknown>;
  status: "pending" | "generating" | "completed" | "error";
  progress: GenerationProgress | null;
  previewImage: string | null;
  images: GeneratedImage[];
  error: string | null;
  startTime: number;
  endTime: number | null;
}

// Polling state (outside store to avoid re-renders)
let pollIntervalId: NodeJS.Timeout | null = null;

interface GenerationState {
  // Current generation
  currentRequest: GenerationRequest | null;
  isGenerating: boolean;

  // Reconnection state
  isReconnected: boolean;
  reconnectedGeneration: ActiveGeneration | null;

  // Queue tracking (local count for accurate display)
  queuedCount: number;

  // Batch of generated images (current session)
  batch: GeneratedImage[];
  batchId: string | null;

  // Starred images state (shared between components)
  starredImages: Record<string, boolean>;

  // History of recent generations
  history: GenerationRequest[];
  maxHistorySize: number;

  // Generation settings
  isGeneratingForever: boolean;
  isGeneratingPreviews: boolean;

  // Actions
  startGeneration: (params: Record<string, unknown>) => string;
  updateProgress: (requestId: string, progress: GenerationProgress) => void;
  setPreviewImage: (requestId: string, previewUrl: string) => void;
  addGeneratedImage: (requestId: string, image: GeneratedImage) => void;
  completeGeneration: (requestId: string) => void;
  failGeneration: (requestId: string, error: string) => void;
  cancelGeneration: () => void;
  clearBatch: () => void;
  removeFromBatch: (index: number) => void;
  setImageStarred: (imagePath: string, starred: boolean) => void;
  setGeneratingForever: (value: boolean) => void;
  setGeneratingPreviews: (value: boolean) => void;
  incrementQueue: () => void;
  decrementQueue: () => void;
  resetQueue: () => void;

  // Reconnection actions
  checkActiveGenerations: (sessionId: string, sessionStartTime?: number) => Promise<void>;
  startPolling: (sessionId: string, interval?: number) => void;
  stopPolling: () => void;

  // Session image loading
  loadSessionImages: (sessionId: string, sessionStartTime: number) => Promise<void>;
}

function generateId(): string {
  return `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Parse metadata from string or object (API may return stringified JSON)
function parseMetadata(meta?: string | ImageMetadata): ImageMetadata | undefined {
  if (!meta) return undefined;
  if (typeof meta === "string") {
    try {
      return JSON.parse(meta);
    } catch {
      return undefined;
    }
  }
  return meta;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  // Initial state
  currentRequest: null,
  isGenerating: false,
  isReconnected: false,
  reconnectedGeneration: null,
  queuedCount: 0,
  batch: [],
  batchId: null,
  starredImages: {},
  history: [],
  maxHistorySize: 50,
  isGeneratingForever: false,
  isGeneratingPreviews: false,

  startGeneration: (params: Record<string, unknown>) => {
    const id = generateId();
    const batchId = get().batchId || generateId();

    const request: GenerationRequest = {
      id,
      params,
      status: "generating",
      progress: null,
      previewImage: null,
      images: [],
      error: null,
      startTime: Date.now(),
      endTime: null,
    };

    set({
      currentRequest: request,
      isGenerating: true,
      batchId,
    });

    return id;
  },

  updateProgress: (requestId: string, progress: GenerationProgress) => {
    set((state) => {
      if (state.currentRequest?.id !== requestId) {
        return state;
      }

      return {
        currentRequest: {
          ...state.currentRequest,
          progress,
        },
      };
    });
  },

  setPreviewImage: (requestId: string, previewUrl: string) => {
    set((state) => {
      if (state.currentRequest?.id !== requestId) {
        return state;
      }

      return {
        currentRequest: {
          ...state.currentRequest,
          previewImage: previewUrl,
        },
      };
    });
  },

  addGeneratedImage: (requestId: string, image: GeneratedImage) => {
    set((state) => {
      if (state.currentRequest?.id !== requestId) {
        return state;
      }

      const updatedRequest = {
        ...state.currentRequest,
        images: [...state.currentRequest.images, image],
      };

      return {
        currentRequest: updatedRequest,
        batch: [...state.batch, image],
      };
    });
  },

  completeGeneration: (requestId: string) => {
    set((state) => {
      if (state.currentRequest?.id !== requestId) {
        return state;
      }

      const completedRequest: GenerationRequest = {
        ...state.currentRequest,
        status: "completed",
        endTime: Date.now(),
      };

      // Add to history
      const newHistory = [completedRequest, ...state.history].slice(
        0,
        state.maxHistorySize
      );

      return {
        currentRequest: null,
        isGenerating: false,
        history: newHistory,
      };
    });
  },

  failGeneration: (requestId: string, error: string) => {
    set((state) => {
      if (state.currentRequest?.id !== requestId) {
        return state;
      }

      const failedRequest: GenerationRequest = {
        ...state.currentRequest,
        status: "error",
        error,
        endTime: Date.now(),
      };

      // Add to history even if failed
      const newHistory = [failedRequest, ...state.history].slice(
        0,
        state.maxHistorySize
      );

      return {
        currentRequest: null,
        isGenerating: false,
        history: newHistory,
      };
    });
  },

  cancelGeneration: () => {
    set((state) => {
      if (!state.currentRequest) {
        return state;
      }

      const cancelledRequest: GenerationRequest = {
        ...state.currentRequest,
        status: "error",
        error: "Cancelled by user",
        endTime: Date.now(),
      };

      return {
        currentRequest: null,
        isGenerating: false,
        isGeneratingForever: false,
        isGeneratingPreviews: false,
        history: [cancelledRequest, ...state.history].slice(0, state.maxHistorySize),
      };
    });
  },

  clearBatch: () => {
    set({
      batch: [],
      batchId: null,
    });
  },

  removeFromBatch: (index: number) => {
    set((state) => ({
      batch: state.batch.filter((_, i) => i !== index),
    }));
  },

  setImageStarred: (imagePath: string, starred: boolean) => {
    set((state) => ({
      starredImages: { ...state.starredImages, [imagePath]: starred },
    }));
  },

  setGeneratingForever: (value: boolean) => {
    set({ isGeneratingForever: value });
  },

  setGeneratingPreviews: (value: boolean) => {
    set({ isGeneratingPreviews: value });
  },

  incrementQueue: () => {
    set((state) => ({ queuedCount: state.queuedCount + 1 }));
  },

  decrementQueue: () => {
    set((state) => ({ queuedCount: Math.max(0, state.queuedCount - 1) }));
  },

  resetQueue: () => {
    set({ queuedCount: 0 });
  },

  checkActiveGenerations: async (sessionId: string, sessionStartTime?: number) => {
    try {
      const response = await getActiveGenerations(sessionId);
      console.log("[Generation] GetActiveGenerations response:", response);
      const activeGen = response.generations.find(g => g.live_gens > 0 || g.waiting_gens > 0);

      if (activeGen) {
        // Found active generation - we're in reconnected mode
        console.log("[Generation] Reconnecting to active generation:", activeGen);
        set({
          isGenerating: true,
          isReconnected: true,
          reconnectedGeneration: activeGen,
          queuedCount: Math.max(0, activeGen.waiting_gens - activeGen.live_gens),
        });
      } else {
        // No active generations
        set({
          isReconnected: false,
          reconnectedGeneration: null,
        });

        // If batch is empty and we have a valid session start time, load session images
        const { batch } = get();
        if (batch.length === 0 && sessionStartTime && sessionStartTime > 0) {
          get().loadSessionImages(sessionId, sessionStartTime);
        }
      }
    } catch (error) {
      console.error("Failed to check active generations:", error);
    }
  },

  startPolling: (sessionId: string, interval: number = 2000) => {
    const { stopPolling, checkActiveGenerations } = get();

    // Stop any existing polling
    stopPolling();

    // Start new polling
    pollIntervalId = setInterval(async () => {
      const { isReconnected, reconnectedGeneration } = get();

      if (!isReconnected) {
        // Not in reconnected mode, stop polling
        stopPolling();
        return;
      }

      try {
        const response = await getActiveGenerations(sessionId);
        const activeGen = response.generations.find(g => g.live_gens > 0 || g.waiting_gens > 0);

        if (activeGen) {
          // Update progress
          set({
            reconnectedGeneration: activeGen,
            queuedCount: Math.max(0, activeGen.waiting_gens - activeGen.live_gens),
          });
        } else {
          // Generation complete - fetch recent images
          const { reconnectedGeneration } = get();
          const generationStartTime = reconnectedGeneration?.start_time || 0;

          try {
            // Fetch recent images sorted by date (newest first)
            const imagesResponse = await listImages({
              path: "",
              depth: 2,
              sortBy: "date",
              sortReverse: true,
              limit: 20,
            }, sessionId);

            // Add recent images to batch
            const newImages: GeneratedImage[] = [];
            for (const file of imagesResponse.files) {
              // Create GeneratedImage from the file
              // file.src is relative path like "2025-01-04/image.png", need to prefix with /Output/
              const metadata = parseMetadata(file.metadata as string | ImageMetadata | undefined);
              const image: GeneratedImage = {
                image: `/Output/${file.src}`,
                metadata: metadata || { prompt: "", model: "", seed: 0, steps: 0, cfgscale: 0, width: 0, height: 0 },
                batch_id: `reconnect-${generationStartTime}`,
              };
              newImages.push(image);
              // Only add a few images to avoid flooding
              if (newImages.length >= 5) break;
            }

            if (newImages.length > 0) {
              console.log("[Generation] Adding", newImages.length, "images from reconnected generation");
              set((state) => ({
                batch: [...state.batch, ...newImages],
              }));
            }
          } catch (error) {
            console.error("Failed to fetch recent images:", error);
          }

          set({
            isGenerating: false,
            isReconnected: false,
            reconnectedGeneration: null,
            queuedCount: 0,
          });
          stopPolling();
        }
      } catch (error) {
        console.error("Polling failed:", error);
      }
    }, interval);

    // Run immediately once
    checkActiveGenerations(sessionId);
  },

  stopPolling: () => {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  },

  loadSessionImages: async (sessionId: string, sessionStartTime: number) => {
    try {
      console.log("[Generation] Loading images from session started at", sessionStartTime ? new Date(sessionStartTime).toISOString() : "unknown");

      // Fetch recent images sorted by date (newest first)
      // Use depth: 5 to search into date subfolders like 2025-01-04/
      const imagesResponse = await listImages({
        path: "",
        depth: 5,
        sortBy: "date",
        sortReverse: true,
      }, sessionId);

      console.log("[Generation] ListImages response:", imagesResponse.files.length, "files,", imagesResponse.folders.length, "folders");
      if (imagesResponse.folders.length > 0) {
        console.log("[Generation] Folders found:", imagesResponse.folders.slice(0, 5));
      }

      // Filter to images created after session start time
      const filteredFiles = imagesResponse.files.filter(file => {
        // Parse metadata first (API may return stringified JSON)
        const meta = parseMetadata(file.metadata as string | ImageMetadata | undefined);

        // First check if metadata has generation_time (set by our UI)
        const genTime = meta?.generation_time as number | undefined;
        if (genTime && genTime >= sessionStartTime) {
          return true;
        }

        // Fallback: parse date from file path (e.g., "raw/2026-01-04/..." or "2026-01-04/...")
        const sessionStartDate = new Date(sessionStartTime);
        sessionStartDate.setHours(0, 0, 0, 0); // Start of the session day

        const dateMatch = file.src.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const fileDate = new Date(dateMatch[1]);
          return fileDate >= sessionStartDate;
        }
        // If no date in path, exclude (likely an example/input file)
        return false;
      });

      console.log("[Generation] Filtered to", filteredFiles.length, "files after session start");

      // Take the most recent images (from the end since API returns oldest first)
      const recentFiles = filteredFiles.slice(-20);
      const newImages: GeneratedImage[] = [];
      for (const file of recentFiles) {
        // Parse metadata (API may return stringified JSON)
        const metadata = parseMetadata(file.metadata as string | ImageMetadata | undefined);

        const image: GeneratedImage = {
          image: `/Output/${file.src}`,
          metadata: metadata || { prompt: "", model: "", seed: 0, steps: 0, cfgscale: 0, width: 0, height: 0 },
          batch_id: `session-${sessionStartTime}`,
        };
        newImages.push(image);
      }

      if (newImages.length > 0) {
        console.log("[Generation] Loaded", newImages.length, "images from session");
        // Show newest first (descending order)
        set({ batch: newImages });
      } else {
        console.log("[Generation] No images found to load");
      }
    } catch (error) {
      console.error("Failed to load session images:", error);
    }
  },
}));
