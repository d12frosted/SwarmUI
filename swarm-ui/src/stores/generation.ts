"use client";

import { create } from "zustand";
import type { GeneratedImage, GenerationProgress, ActiveGeneration, ImageMetadata } from "@/types/api";
import { getActiveGenerations, listImages } from "@/lib/api";

export interface GenerationRequest {
  id: string;
  params: Record<string, unknown>;
  batchSize: number; // Number of images this request will generate
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
let syncTimeoutId: NodeJS.Timeout | null = null;

interface GenerationState {
  // All active generation requests (tracked by ID)
  activeRequests: Record<string, GenerationRequest>;

  // Primary request ID (for progress display in UI)
  primaryRequestId: string | null;

  // Computed: true if any requests are active
  isGenerating: boolean;

  // Reconnection state
  isReconnected: boolean;
  reconnectedGeneration: ActiveGeneration | null;

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
  cancelAllGenerations: () => void;
  clearBatch: () => void;
  removeFromBatch: (index: number) => void;
  setImageStarred: (imagePath: string, starred: boolean) => void;
  setGeneratingForever: (value: boolean) => void;
  setGeneratingPreviews: (value: boolean) => void;

  // Helpers
  getActiveCount: () => number;
  getTotalImageCount: () => { generating: number; queued: number };
  getPrimaryRequest: () => GenerationRequest | null;

  // Reconnection actions
  checkActiveGenerations: (sessionId: string, sessionStartTime?: number) => Promise<void>;
  syncWithServer: (sessionId: string) => Promise<void>;
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

// Helper to compute isGenerating from activeRequests
function computeIsGenerating(activeRequests: Record<string, GenerationRequest>): boolean {
  return Object.values(activeRequests).some(r => r.status === "generating" || r.status === "pending");
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  // Initial state
  activeRequests: {},
  primaryRequestId: null,
  isGenerating: false,
  isReconnected: false,
  reconnectedGeneration: null,
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
    const { activeRequests, primaryRequestId } = get();

    // Extract batch size from params (images parameter)
    const batchSize = Math.max(1, Number(params.images) || 1);

    const request: GenerationRequest = {
      id,
      params,
      batchSize,
      status: "generating",
      progress: null,
      previewImage: null,
      images: [],
      error: null,
      startTime: Date.now(),
      endTime: null,
    };

    const newActiveRequests = { ...activeRequests, [id]: request };

    set({
      activeRequests: newActiveRequests,
      // First request becomes primary
      primaryRequestId: primaryRequestId || id,
      isGenerating: true,
      batchId,
    });

    console.log(`[Generation] Started request ${id}, batch size: ${batchSize}, active count: ${Object.keys(newActiveRequests).length}`);
    return id;
  },

  updateProgress: (requestId: string, progress: GenerationProgress) => {
    set((state) => {
      const request = state.activeRequests[requestId];
      if (!request) return state;

      return {
        activeRequests: {
          ...state.activeRequests,
          [requestId]: { ...request, progress },
        },
      };
    });
  },

  setPreviewImage: (requestId: string, previewUrl: string) => {
    set((state) => {
      const request = state.activeRequests[requestId];
      if (!request) return state;

      return {
        activeRequests: {
          ...state.activeRequests,
          [requestId]: { ...request, previewImage: previewUrl },
        },
      };
    });
  },

  addGeneratedImage: (requestId: string, image: GeneratedImage) => {
    set((state) => {
      const request = state.activeRequests[requestId];
      if (!request) {
        // Request not found - still add image to batch (might be from queue)
        console.log(`[Generation] Adding image from unknown request ${requestId}`);
        return {
          batch: [...state.batch, image],
        };
      }

      return {
        activeRequests: {
          ...state.activeRequests,
          [requestId]: {
            ...request,
            images: [...request.images, image],
          },
        },
        batch: [...state.batch, image],
      };
    });
  },

  completeGeneration: (requestId: string) => {
    const { activeRequests, primaryRequestId, history, maxHistorySize } = get();
    const request = activeRequests[requestId];

    if (!request) {
      console.log(`[Generation] Complete called for unknown request ${requestId}`);
      return;
    }

    const completedRequest: GenerationRequest = {
      ...request,
      status: "completed",
      endTime: Date.now(),
    };

    // Remove from active, add to history
    const { [requestId]: _, ...remainingRequests } = activeRequests;
    const newHistory = [completedRequest, ...history].slice(0, maxHistorySize);

    // If this was the primary request, pick a new one
    let newPrimaryId = primaryRequestId === requestId ? null : primaryRequestId;
    if (!newPrimaryId) {
      const remainingIds = Object.keys(remainingRequests);
      newPrimaryId = remainingIds.length > 0 ? remainingIds[0] : null;
    }

    const isStillGenerating = computeIsGenerating(remainingRequests);

    console.log(`[Generation] Completed request ${requestId}, remaining: ${Object.keys(remainingRequests).length}, isGenerating: ${isStillGenerating}`);

    set({
      activeRequests: remainingRequests,
      primaryRequestId: newPrimaryId,
      isGenerating: isStillGenerating,
      history: newHistory,
      // Clear reconnected state if no more active requests
      isReconnected: isStillGenerating ? get().isReconnected : false,
      reconnectedGeneration: isStillGenerating ? get().reconnectedGeneration : null,
    });
  },

  failGeneration: (requestId: string, error: string) => {
    const { activeRequests, primaryRequestId, history, maxHistorySize } = get();
    const request = activeRequests[requestId];

    if (!request) {
      console.log(`[Generation] Fail called for unknown request ${requestId}`);
      return;
    }

    const failedRequest: GenerationRequest = {
      ...request,
      status: "error",
      error,
      endTime: Date.now(),
    };

    // Remove from active, add to history
    const { [requestId]: _, ...remainingRequests } = activeRequests;
    const newHistory = [failedRequest, ...history].slice(0, maxHistorySize);

    // If this was the primary request, pick a new one
    let newPrimaryId = primaryRequestId === requestId ? null : primaryRequestId;
    if (!newPrimaryId) {
      const remainingIds = Object.keys(remainingRequests);
      newPrimaryId = remainingIds.length > 0 ? remainingIds[0] : null;
    }

    const isStillGenerating = computeIsGenerating(remainingRequests);

    console.log(`[Generation] Failed request ${requestId}: ${error}, remaining: ${Object.keys(remainingRequests).length}`);

    set({
      activeRequests: remainingRequests,
      primaryRequestId: newPrimaryId,
      isGenerating: isStillGenerating,
      history: newHistory,
    });
  },

  cancelAllGenerations: () => {
    const { activeRequests, history, maxHistorySize } = get();

    // Mark all active requests as cancelled and move to history
    const cancelledRequests = Object.values(activeRequests).map(request => ({
      ...request,
      status: "error" as const,
      error: "Cancelled by user",
      endTime: Date.now(),
    }));

    const newHistory = [...cancelledRequests, ...history].slice(0, maxHistorySize);

    console.log(`[Generation] Cancelled ${cancelledRequests.length} active requests`);

    set({
      activeRequests: {},
      primaryRequestId: null,
      isGenerating: false,
      isGeneratingForever: false,
      isGeneratingPreviews: false,
      history: newHistory,
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

  getActiveCount: () => {
    return Object.keys(get().activeRequests).length;
  },

  getTotalImageCount: () => {
    const { activeRequests, primaryRequestId, isReconnected, reconnectedGeneration } = get();
    const requests = Object.values(activeRequests);

    // If we have local request tracking, use accurate counts
    if (requests.length > 0) {
      let generating = 0;
      let queued = 0;

      for (const req of requests) {
        // Get batch size - fallback to params.images or 1 for old requests without batchSize
        const batchSize = req.batchSize || Number(req.params?.images) || 1;
        // Calculate remaining images for this request
        const generated = req.images.length;
        const remaining = Math.max(0, batchSize - generated);

        if (req.id === primaryRequestId) {
          generating = remaining;
        } else {
          queued += batchSize; // Queued requests haven't started, count full batch
        }
      }

      return { generating, queued };
    }

    // Fallback: use server counts from reconnected state (these are request counts, not image counts)
    // We show them as "images" for UI consistency, accepting we can't know actual batch sizes
    if (isReconnected && reconnectedGeneration) {
      return {
        generating: reconnectedGeneration.live_gens,
        queued: reconnectedGeneration.waiting_gens,
      };
    }

    return { generating: 0, queued: 0 };
  },

  getPrimaryRequest: () => {
    const { activeRequests, primaryRequestId } = get();
    return primaryRequestId ? activeRequests[primaryRequestId] || null : null;
  },

  syncWithServer: async (sessionId: string) => {
    try {
      const response = await getActiveGenerations(sessionId);
      const serverGen = response.generations.find(g => g.live_gens > 0 || g.waiting_gens > 0);
      const { activeRequests, isReconnected } = get();
      const localCount = Object.keys(activeRequests).length;

      if (serverGen) {
        const serverCount = serverGen.live_gens + serverGen.waiting_gens;

        if (localCount === 0 && serverCount > 0) {
          // Server has active generations but we don't - enter reconnected mode
          console.log(`[Generation] Sync: Server has ${serverCount} active, we have ${localCount}. Entering reconnected mode.`);
          set({
            isGenerating: true,
            isReconnected: true,
            reconnectedGeneration: serverGen,
          });
          get().startPolling(sessionId);
        } else if (localCount > 0 && !isReconnected) {
          // We have local tracking, just log the sync
          console.log(`[Generation] Sync: Server has ${serverCount}, we track ${localCount}`);
        }
      } else if (localCount === 0 && isReconnected) {
        // Server shows complete, we were in reconnected mode
        console.log("[Generation] Sync: Server shows no active generations, clearing reconnected state");
        set({
          isReconnected: false,
          reconnectedGeneration: null,
        });
        get().stopPolling();
      }
    } catch (error) {
      console.error("[Generation] Sync failed:", error);
    }
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
    const { stopPolling } = get();

    // Stop any existing polling
    stopPolling();

    console.log("[Generation] Starting polling for reconnected generation");

    // Start new polling
    pollIntervalId = setInterval(async () => {
      const { isReconnected } = get();

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
          });
        } else {
          // Generation complete - fetch recent images
          const { reconnectedGeneration, batch } = get();
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

            // Find images not already in batch
            const existingPaths = new Set(batch.map(img => img.image));
            const newImages: GeneratedImage[] = [];

            for (const file of imagesResponse.files) {
              const imagePath = `/Output/${file.src}`;
              if (existingPaths.has(imagePath)) continue;

              const metadata = parseMetadata(file.metadata as string | ImageMetadata | undefined);
              const image: GeneratedImage = {
                image: imagePath,
                metadata: metadata || { prompt: "", model: "", seed: 0, steps: 0, cfgscale: 0, width: 0, height: 0 },
                batch_id: `reconnect-${generationStartTime}`,
              };
              newImages.push(image);
              // Only add a few images to avoid flooding
              if (newImages.length >= 10) break;
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
          });
          stopPolling();
        }
      } catch (error) {
        console.error("Polling failed:", error);
      }
    }, interval);
  },

  stopPolling: () => {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId);
      syncTimeoutId = null;
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
