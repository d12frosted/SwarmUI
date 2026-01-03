"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { T2IParamType, T2IParamsResponse } from "@/types/api";
import { listT2IParams } from "@/lib/api";

interface ParametersState {
  // Parameter definitions from server
  paramTypes: T2IParamType[];
  availableModels: string[];
  wildcards: string[];

  // Current parameter values
  values: Record<string, unknown>;

  // State flags
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  loadParams: (sessionId: string) => Promise<void>;
  setValue: (id: string, value: unknown) => void;
  setValues: (values: Record<string, unknown>) => void;
  resetToDefaults: () => void;
  getGenerationInput: () => Record<string, unknown>;
}

// Default values for core parameters
const DEFAULT_VALUES: Record<string, unknown> = {
  prompt: "",
  negativeprompt: "",
  images: 1,
  steps: 20,
  cfgscale: 7,
  width: 512,
  height: 512,
  seed: -1,
  sampler: "euler",
  scheduler: "normal",
};

export const useParametersStore = create<ParametersState>()(
  persist(
    (set, get) => ({
      paramTypes: [],
      availableModels: [],
      wildcards: [],
      values: { ...DEFAULT_VALUES },
      isLoading: false,
      isLoaded: false,
      error: null,

      loadParams: async (sessionId: string) => {
        if (get().isLoading) return;

        set({ isLoading: true, error: null });

        try {
          const response = await listT2IParams(sessionId);

          // Initialize values from defaults
          const newValues: Record<string, unknown> = { ...get().values };

          for (const param of response.list) {
            if (!(param.id in newValues) && param.default !== undefined) {
              newValues[param.id] = param.default;
            }
          }

          set({
            paramTypes: response.list,
            availableModels: response.models,
            wildcards: response.wildcards,
            values: newValues,
            isLoaded: true,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load parameters",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      setValue: (id: string, value: unknown) => {
        set((state) => ({
          values: { ...state.values, [id]: value },
        }));
      },

      setValues: (values: Record<string, unknown>) => {
        set((state) => ({
          values: { ...state.values, ...values },
        }));
      },

      resetToDefaults: () => {
        const { paramTypes } = get();
        const newValues: Record<string, unknown> = {};

        for (const param of paramTypes) {
          if (param.default !== undefined) {
            newValues[param.id] = param.default;
          }
        }

        set({ values: { ...DEFAULT_VALUES, ...newValues } });
      },

      getGenerationInput: () => {
        const { values, paramTypes } = get();
        const input: Record<string, unknown> = {};

        for (const param of paramTypes) {
          const value = values[param.id];
          if (value !== undefined && value !== null && value !== "") {
            input[param.id] = value;
          }
        }

        // Always include core params
        if (values.prompt) input.prompt = values.prompt;
        if (values.negativeprompt) input.negativeprompt = values.negativeprompt;

        return input;
      },
    }),
    {
      name: "swarm-parameters",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        values: state.values,
      }),
    }
  )
);
