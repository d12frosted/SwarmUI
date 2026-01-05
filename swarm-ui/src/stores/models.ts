"use client";

import { create } from "zustand";
import type { ModelData } from "@/types/api";
import { listModels, listLoadedModels } from "@/lib/api";

interface ModelsState {
  // Models data - stored as array now
  models: ModelData[];
  loadedModels: string[];
  currentModel: string | null;

  // State flags
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  modelClass: string | null;

  // Actions
  loadModels: (sessionId: string) => Promise<void>;
  refreshModels: (sessionId: string) => Promise<void>;
  refreshLoadedModels: (sessionId: string) => Promise<void>;
  setCurrentModel: (modelName: string | null) => void;
  setSearchQuery: (query: string) => void;
  setModelClass: (cls: string | null) => void;
  getFilteredModels: () => ModelData[];
  getModelByName: (name: string) => ModelData | undefined;
  invalidate: () => void;
}

export const useModelsStore = create<ModelsState>((set, get) => ({
  models: [],
  loadedModels: [],
  currentModel: null,
  isLoading: false,
  isLoaded: false,
  error: null,
  searchQuery: "",
  modelClass: null,

  loadModels: async (sessionId: string) => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // Load all models
      const response = await listModels({}, sessionId);

      // Extract loaded models from the response
      const loadedModels = response.files
        .filter((m) => m.loaded)
        .map((m) => m.name);

      set({
        models: response.files,
        loadedModels,
        isLoaded: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load models",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshModels: async (sessionId: string) => {
    // Force refresh - reload even if already loaded
    set({ isLoading: true, error: null });

    try {
      const response = await listModels({}, sessionId);

      const loadedModels = response.files
        .filter((m) => m.loaded)
        .map((m) => m.name);

      set({
        models: response.files,
        loadedModels,
        isLoaded: true,
      });
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

  invalidate: () => {
    // Mark as not loaded so next loadModels call will fetch fresh data
    set({ isLoaded: false });
  },

  setCurrentModel: (modelName: string | null) => {
    set({ currentModel: modelName });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setModelClass: (cls: string | null) => {
    set({ modelClass: cls });
  },

  getFilteredModels: () => {
    const { models, searchQuery, modelClass, loadedModels } = get();
    let filtered = [...models];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (model) =>
          model.name.toLowerCase().includes(query) ||
          model.title?.toLowerCase().includes(query) ||
          model.description?.toLowerCase().includes(query) ||
          model.author?.toLowerCase().includes(query)
      );
    }

    // Filter by class
    if (modelClass) {
      filtered = filtered.filter((model) => model.class === modelClass);
    }

    // Sort: loaded models first, then alphabetically by title/name
    filtered.sort((a, b) => {
      const aLoaded = a.loaded || loadedModels.includes(a.name);
      const bLoaded = b.loaded || loadedModels.includes(b.name);
      if (aLoaded && !bLoaded) return -1;
      if (!aLoaded && bLoaded) return 1;
      const aName = a.title || a.name;
      const bName = b.title || b.name;
      return aName.localeCompare(bName);
    });

    return filtered;
  },

  getModelByName: (name: string) => {
    return get().models.find((m) => m.name === name);
  },
}));
