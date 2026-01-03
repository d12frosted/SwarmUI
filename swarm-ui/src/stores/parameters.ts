"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { T2IParamType, T2IParamGroup, T2IParamsResponse } from "@/types/api";
import { listT2IParams } from "@/lib/api";
import { useStatusStore } from "./status";

interface ParametersState {
  // Parameter definitions from server
  paramTypes: T2IParamType[];
  paramGroups: T2IParamGroup[];
  availableModels: string[];
  wildcards: string[];

  // Current parameter values
  values: Record<string, unknown>;

  // Toggle states for groups and toggleable params
  // Groups with toggles: true start as disabled
  enabledGroups: Record<string, boolean>;
  enabledToggles: Record<string, boolean>;

  // State flags
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  loadParams: (sessionId: string) => Promise<void>;
  setValue: (id: string, value: unknown) => void;
  setValues: (values: Record<string, unknown>) => void;
  setGroupEnabled: (groupId: string, enabled: boolean) => void;
  setToggleEnabled: (paramId: string, enabled: boolean) => void;
  resetToDefaults: () => void;
  getGenerationInput: () => Record<string, unknown>;
  isGroupEnabled: (groupId: string) => boolean;
  isParamEnabled: (paramId: string) => boolean;
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
      paramGroups: [],
      availableModels: [],
      wildcards: [],
      values: { ...DEFAULT_VALUES },
      enabledGroups: {},
      enabledToggles: {},
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
          const currentEnabledGroups = get().enabledGroups;
          const currentEnabledToggles = get().enabledToggles;

          // Initialize group toggle states - groups with toggles default to disabled
          const enabledGroups: Record<string, boolean> = { ...currentEnabledGroups };
          for (const group of response.groups || []) {
            if (group.toggles && !(group.id in enabledGroups)) {
              enabledGroups[group.id] = false; // Default: disabled
            }
          }

          // Initialize param values and toggle states
          const enabledToggles: Record<string, boolean> = { ...currentEnabledToggles };
          for (const param of response.list) {
            if (!(param.id in newValues) && param.default !== undefined) {
              newValues[param.id] = param.default;
            }
            // Toggleable params default to disabled
            if (param.toggleable && !(param.id in enabledToggles)) {
              enabledToggles[param.id] = false;
            }
          }

          set({
            paramTypes: response.list,
            paramGroups: response.groups || [],
            availableModels: response.models,
            wildcards: response.wildcards,
            values: newValues,
            enabledGroups,
            enabledToggles,
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

      setGroupEnabled: (groupId: string, enabled: boolean) => {
        set((state) => ({
          enabledGroups: { ...state.enabledGroups, [groupId]: enabled },
        }));
      },

      setToggleEnabled: (paramId: string, enabled: boolean) => {
        set((state) => ({
          enabledToggles: { ...state.enabledToggles, [paramId]: enabled },
        }));
      },

      isGroupEnabled: (groupId: string) => {
        const { paramGroups, enabledGroups } = get();
        const group = paramGroups.find((g) => g.id === groupId);
        // If group doesn't have toggles, it's always enabled
        if (!group || !group.toggles) return true;
        return enabledGroups[groupId] ?? false;
      },

      isParamEnabled: (paramId: string) => {
        const { paramTypes, enabledToggles } = get();
        const param = paramTypes.find((p) => p.id === paramId);
        // If param isn't toggleable, it's always enabled (unless group is disabled)
        if (!param || !param.toggleable) return true;
        return enabledToggles[paramId] ?? false;
      },

      resetToDefaults: () => {
        const { paramTypes, paramGroups } = get();
        const newValues: Record<string, unknown> = {};

        for (const param of paramTypes) {
          if (param.default !== undefined) {
            newValues[param.id] = param.default;
          }
        }

        // Reset all toggles to disabled
        const enabledGroups: Record<string, boolean> = {};
        for (const group of paramGroups) {
          if (group.toggles) {
            enabledGroups[group.id] = false;
          }
        }

        const enabledToggles: Record<string, boolean> = {};
        for (const param of paramTypes) {
          if (param.toggleable) {
            enabledToggles[param.id] = false;
          }
        }

        set({
          values: { ...DEFAULT_VALUES, ...newValues },
          enabledGroups,
          enabledToggles,
        });
      },

      getGenerationInput: () => {
        const { values, paramTypes, paramGroups, enabledGroups, enabledToggles } = get();
        const input: Record<string, unknown> = {};

        // Get supported features from status store
        const supportedFeatures = useStatusStore.getState().supportedFeatures;

        // Build a map of group id -> group for quick lookup
        const groupMap = new Map(paramGroups.map((g) => [g.id, g]));

        // Helper to check if a group (and its parent chain) is enabled
        const isGroupChainEnabled = (groupId: string | undefined): boolean => {
          if (!groupId) return true;
          const group = groupMap.get(groupId);
          if (!group) return true;
          // If this group has toggles and is disabled, return false
          if (group.toggles && !enabledGroups[groupId]) {
            return false;
          }
          // Check parent group
          return isGroupChainEnabled(group.parent);
        };

        for (const param of paramTypes) {
          const value = values[param.id];

          // Skip empty values
          if (value === undefined || value === null || value === "") {
            continue;
          }

          // Skip parameters that require unsupported backend features
          if (param.feature_flag && !supportedFeatures.includes(param.feature_flag)) {
            continue;
          }

          // Skip if param's group (or any parent group) is toggled off
          if (!isGroupChainEnabled(param.group)) {
            continue;
          }

          // Skip toggleable parameters that are disabled
          if (param.toggleable && !enabledToggles[param.id]) {
            continue;
          }

          input[param.id] = value;
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
        enabledGroups: state.enabledGroups,
        enabledToggles: state.enabledToggles,
      }),
    }
  )
);
