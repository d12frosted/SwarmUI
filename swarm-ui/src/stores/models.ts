"use client";

import { create } from "zustand";
import type { ModelData } from "@/types/api";
import { listModels, describeModel, listLoadedModels } from "@/lib/api";

interface ModelsState {
  // Models data
  models: Record<string, ModelData>;
  loadedModels: string[];
  currentModel: string | null;

  // State flags
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  modelType: string | null;

  // Actions
  loadModels: (sessionId: string) => Promise<void>;
  refreshLoadedModels: (sessionId: string) => Promise<void>;
  setCurrentModel: (modelName: string | null) => void;
  setSearchQuery: (query: string) => void;
  setModelType: (type: string | null) => void;
  getFilteredModels: () => ModelData[];
}

export const useModelsStore = create<ModelsState>((set, get) => ({
  models: {},
  loadedModels: [],
  currentModel: null,
  isLoading: false,
  isLoaded: false,
  error: null,
  searchQuery: "",
  modelType: null,

  loadModels: async (sessionId: string) => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // Load all models
      const response = await listModels({ depth: 10 }, sessionId);

      set({
        models: response.models,
        isLoaded: true,
      });

      // Also load currently loaded models
      await get().refreshLoadedModels(sessionId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load models",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshLoadedModels: async (sessionId: string) => {
    try {
      const response = await listLoadedModels(sessionId);
      set({ loadedModels: response.models });
    } catch (error) {
      console.error("Failed to refresh loaded models:", error);
    }
  },

  setCurrentModel: (modelName: string | null) => {
    set({ currentModel: modelName });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setModelType: (type: string | null) => {
    set({ modelType: type });
  },

  getFilteredModels: () => {
    const { models, searchQuery, modelType } = get();
    let filtered = Object.values(models);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (model) =>
          model.name.toLowerCase().includes(query) ||
          model.title?.toLowerCase().includes(query) ||
          model.description?.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (modelType) {
      filtered = filtered.filter((model) => model.type === modelType);
    }

    // Sort: loaded models first, then alphabetically
    const { loadedModels } = get();
    filtered.sort((a, b) => {
      const aLoaded = loadedModels.includes(a.name);
      const bLoaded = loadedModels.includes(b.name);
      if (aLoaded && !bLoaded) return -1;
      if (!aLoaded && bLoaded) return 1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  },
}));
