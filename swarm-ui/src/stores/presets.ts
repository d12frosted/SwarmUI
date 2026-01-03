"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  getUserData,
  addPreset,
  deletePreset,
  duplicatePreset,
  type Preset,
} from "@/lib/api";
import { useParametersStore } from "./parameters";

interface PresetState {
  // All presets from server
  allPresets: Preset[];

  // Currently active presets (stacked)
  activePresets: Preset[];

  // State flags
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  loadPresets: (sessionId: string) => Promise<void>;
  addActivePreset: (preset: Preset) => void;
  removeActivePreset: (title: string) => void;
  clearActivePresets: () => void;
  applyActivePresets: () => void;
  applyPreset: (preset: Preset) => void;
  savePreset: (
    sessionId: string,
    title: string,
    description: string,
    paramMap: Record<string, string>,
    previewImage?: string,
    isEdit?: boolean,
    editing?: string
  ) => Promise<{ success: boolean; error?: string }>;
  deletePreset: (sessionId: string, title: string) => Promise<{ success: boolean; error?: string }>;
  duplicatePreset: (sessionId: string, title: string) => Promise<{ success: boolean; error?: string }>;
  getPresetByTitle: (title: string) => Preset | undefined;
  isPresetActive: (title: string) => boolean;
  togglePreset: (preset: Preset) => void;
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      allPresets: [],
      activePresets: [],
      isLoading: false,
      isLoaded: false,
      error: null,

      loadPresets: async (sessionId: string) => {
        if (get().isLoading) return;

        set({ isLoading: true, error: null });

        try {
          const data = await getUserData(sessionId);
          set({
            allPresets: data.presets || [],
            isLoaded: true,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load presets",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      addActivePreset: (preset: Preset) => {
        const { activePresets } = get();
        if (!activePresets.some((p) => p.title === preset.title)) {
          set({ activePresets: [...activePresets, preset] });
        }
      },

      removeActivePreset: (title: string) => {
        set((state) => ({
          activePresets: state.activePresets.filter((p) => p.title !== title),
        }));
      },

      clearActivePresets: () => {
        set({ activePresets: [] });
      },

      applyPreset: (preset: Preset) => {
        const { setValue } = useParametersStore.getState();

        for (const [key, value] of Object.entries(preset.param_map)) {
          // Handle {value} placeholder in text params (appends to existing value)
          if (typeof value === "string" && value.includes("{value}")) {
            const currentValue = useParametersStore.getState().values[key];
            const newValue = value.replace("{value}", String(currentValue || ""));
            setValue(key, newValue);
          } else {
            // For boolean params stored as strings
            if (value === "true") {
              setValue(key, true);
            } else if (value === "false") {
              setValue(key, false);
            } else {
              setValue(key, value);
            }
          }
        }
      },

      applyActivePresets: () => {
        const { activePresets, applyPreset, clearActivePresets } = get();
        for (const preset of activePresets) {
          applyPreset(preset);
        }
        clearActivePresets();
      },

      savePreset: async (
        sessionId: string,
        title: string,
        description: string,
        paramMap: Record<string, string>,
        previewImage?: string,
        isEdit = false,
        editing?: string
      ) => {
        try {
          const response = await addPreset(
            sessionId,
            title,
            description,
            paramMap,
            previewImage,
            isEdit,
            editing
          );

          if (response.preset_fail) {
            return { success: false, error: response.preset_fail };
          }

          // Reload presets
          await get().loadPresets(sessionId);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to save preset",
          };
        }
      },

      deletePreset: async (sessionId: string, title: string) => {
        try {
          const response = await deletePreset(sessionId, title);

          if (!response.success) {
            return { success: false, error: "Failed to delete preset" };
          }

          // Remove from active presets if present
          get().removeActivePreset(title);

          // Reload presets
          await get().loadPresets(sessionId);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to delete preset",
          };
        }
      },

      duplicatePreset: async (sessionId: string, title: string) => {
        try {
          const response = await duplicatePreset(sessionId, title);

          if (response.preset_fail) {
            return { success: false, error: response.preset_fail };
          }

          // Reload presets
          await get().loadPresets(sessionId);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to duplicate preset",
          };
        }
      },

      getPresetByTitle: (title: string) => {
        return get().allPresets.find(
          (p) => p.title.toLowerCase() === title.toLowerCase()
        );
      },

      isPresetActive: (title: string) => {
        return get().activePresets.some((p) => p.title === title);
      },

      togglePreset: (preset: Preset) => {
        if (get().isPresetActive(preset.title)) {
          get().removeActivePreset(preset.title);
        } else {
          get().addActivePreset(preset);
        }
      },
    }),
    {
      name: "swarm-presets",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist active preset titles, not full data
        activePresetTitles: state.activePresets.map((p) => p.title),
      }),
    }
  )
);
