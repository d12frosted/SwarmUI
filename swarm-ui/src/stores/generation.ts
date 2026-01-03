"use client";

import { create } from "zustand";
import type { GeneratedImage, GenerationProgress, ImageMetadata } from "@/types/api";

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

interface GenerationState {
  // Current generation
  currentRequest: GenerationRequest | null;
  isGenerating: boolean;

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
}

function generateId(): string {
  return `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  // Initial state
  currentRequest: null,
  isGenerating: false,
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
}));
