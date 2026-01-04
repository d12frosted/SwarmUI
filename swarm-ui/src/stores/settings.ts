"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

export interface ParameterVisibility {
  id: string;
  visible: boolean;
  order: number;
}

export interface GroupVisibility {
  id: string;
  collapsed: boolean;
  order: number;
}

interface SettingsState {
  // Theme
  theme: ThemeMode;

  // UI preferences
  sidebarCollapsed: boolean;
  showAdvancedParams: boolean;
  compactMode: boolean;

  // Parameter visibility and ordering
  parameterVisibility: Record<string, ParameterVisibility>;
  groupVisibility: Record<string, GroupVisibility>;

  // Generation defaults
  autoPreview: boolean;
  previewSteps: number;
  defaultBatchSize: number;

  // History
  historyPageSize: number;
  showHistoryMetadata: boolean;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setShowAdvancedParams: (show: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  setParameterVisibility: (id: string, visible: boolean) => void;
  setParameterOrder: (id: string, order: number) => void;
  setGroupCollapsed: (id: string, collapsed: boolean) => void;
  setGroupOrder: (id: string, order: number) => void;
  setAutoPreview: (auto: boolean) => void;
  setPreviewSteps: (steps: number) => void;
  setDefaultBatchSize: (size: number) => void;
  setHistoryPageSize: (size: number) => void;
  setShowHistoryMetadata: (show: boolean) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

const defaultState = {
  theme: "dark" as ThemeMode,
  sidebarCollapsed: false,
  showAdvancedParams: false,
  compactMode: false,
  parameterVisibility: {},
  groupVisibility: {},
  autoPreview: true,
  previewSteps: 5,
  defaultBatchSize: 1,
  historyPageSize: 50,
  showHistoryMetadata: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setTheme: (theme) => set({ theme }),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setShowAdvancedParams: (show) => set({ showAdvancedParams: show }),

      setCompactMode: (compact) => set({ compactMode: compact }),

      setParameterVisibility: (id, visible) =>
        set((state) => ({
          parameterVisibility: {
            ...state.parameterVisibility,
            [id]: {
              ...state.parameterVisibility[id],
              id,
              visible,
              order: state.parameterVisibility[id]?.order ?? 0,
            },
          },
        })),

      setParameterOrder: (id, order) =>
        set((state) => ({
          parameterVisibility: {
            ...state.parameterVisibility,
            [id]: {
              ...state.parameterVisibility[id],
              id,
              visible: state.parameterVisibility[id]?.visible ?? true,
              order,
            },
          },
        })),

      setGroupCollapsed: (id, collapsed) =>
        set((state) => ({
          groupVisibility: {
            ...state.groupVisibility,
            [id]: {
              ...state.groupVisibility[id],
              id,
              collapsed,
              order: state.groupVisibility[id]?.order ?? 0,
            },
          },
        })),

      setGroupOrder: (id, order) =>
        set((state) => ({
          groupVisibility: {
            ...state.groupVisibility,
            [id]: {
              ...state.groupVisibility[id],
              id,
              collapsed: state.groupVisibility[id]?.collapsed ?? false,
              order,
            },
          },
        })),

      setAutoPreview: (auto) => set({ autoPreview: auto }),

      setPreviewSteps: (steps) => set({ previewSteps: steps }),

      setDefaultBatchSize: (size) => set({ defaultBatchSize: size }),

      setHistoryPageSize: (size) => set({ historyPageSize: size }),

      setShowHistoryMetadata: (show) => set({ showHistoryMetadata: show }),

      resetToDefaults: () => set(defaultState),

      exportSettings: () => {
        const state = get();
        const exportData = {
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          showAdvancedParams: state.showAdvancedParams,
          compactMode: state.compactMode,
          parameterVisibility: state.parameterVisibility,
          groupVisibility: state.groupVisibility,
          autoPreview: state.autoPreview,
          previewSteps: state.previewSteps,
          defaultBatchSize: state.defaultBatchSize,
          historyPageSize: state.historyPageSize,
          showHistoryMetadata: state.showHistoryMetadata,
        };
        return JSON.stringify(exportData, null, 2);
      },

      importSettings: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            theme: data.theme ?? defaultState.theme,
            sidebarCollapsed: data.sidebarCollapsed ?? defaultState.sidebarCollapsed,
            showAdvancedParams: data.showAdvancedParams ?? defaultState.showAdvancedParams,
            compactMode: data.compactMode ?? defaultState.compactMode,
            parameterVisibility: data.parameterVisibility ?? defaultState.parameterVisibility,
            groupVisibility: data.groupVisibility ?? defaultState.groupVisibility,
            autoPreview: data.autoPreview ?? defaultState.autoPreview,
            previewSteps: data.previewSteps ?? defaultState.previewSteps,
            defaultBatchSize: data.defaultBatchSize ?? defaultState.defaultBatchSize,
            historyPageSize: data.historyPageSize ?? defaultState.historyPageSize,
            showHistoryMetadata: data.showHistoryMetadata ?? defaultState.showHistoryMetadata,
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "swarm-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
