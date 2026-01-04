"use client";

import { create } from "zustand";
import type { GeneratedImage, GenerationProgress, ActiveGeneration } from "@/types/api";
import { getActiveGenerations } from "@/lib/api";

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
  setGeneratingForever: (value: boolean) => void;
  setGeneratingPreviews: (value: boolean) => void;
  incrementQueue: () => void;
  decrementQueue: () => void;
  resetQueue: () => void;

  // Reconnection actions
  checkActiveGenerations: (sessionId: string) => Promise<void>;
  startPolling: (sessionId: string, interval?: number) => void;
  stopPolling: () => void;
}

function generateId(): string {
  return `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  checkActiveGenerations: async (sessionId: string) => {
    try {
      const response = await getActiveGenerations(sessionId);
      const activeGen = response.generations.find(g => g.live_gens > 0 || g.waiting_gens > 0);

      if (activeGen) {
        // Found active generation - we're in reconnected mode
        set({
          isGenerating: true,
          isReconnected: true,
          reconnectedGeneration: activeGen,
          queuedCount: Math.max(0, activeGen.waiting_gens - 1), // -1 because one is live
        });
      } else {
        // No active generations
        set({
          isReconnected: false,
          reconnectedGeneration: null,
        });
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
            queuedCount: Math.max(0, activeGen.waiting_gens),
          });
        } else {
          // Generation complete
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
}));
