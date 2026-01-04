"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ModelData } from "@/types/api";
import { listModels } from "@/lib/api";
import { useParametersStore } from "./parameters";

export interface SelectedLora {
  name: string;
  weight: number;
  confinement: number; // 0=Global, 1=Refiner, 2=Video, 3=VideoSwap, 5=Base
  model?: ModelData;
}

export const CONFINEMENT_OPTIONS = [
  { value: 0, label: "Global" },
  { value: 5, label: "Base" },
  { value: 1, label: "Refiner" },
  { value: 2, label: "Video" },
  { value: 3, label: "VideoSwap" },
] as const;

interface LoraState {
  // Available LoRA models
  availableLoras: ModelData[];

  // Currently selected LoRAs
  selectedLoras: SelectedLora[];

  // Remembered weights per LoRA name
  weightPrefs: Record<string, number>;
  confinementPrefs: Record<string, number>;

  // State flags
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Search
  searchQuery: string;

  // Actions
  loadLoras: (sessionId: string) => Promise<void>;
  selectLora: (lora: ModelData) => void;
  deselectLora: (name: string) => void;
  toggleLora: (lora: ModelData) => void;
  setWeight: (name: string, weight: number) => void;
  setConfinement: (name: string, confinement: number) => void;
  clearAll: () => void;
  setSearchQuery: (query: string) => void;
  isSelected: (name: string) => boolean;
  getFilteredLoras: () => ModelData[];
  syncToParams: () => void;
  syncFromParams: () => void;
}

export const useLoraStore = create<LoraState>()(
  persist(
    (set, get) => ({
      availableLoras: [],
      selectedLoras: [],
      weightPrefs: {},
      confinementPrefs: {},
      isLoading: false,
      isLoaded: false,
      error: null,
      searchQuery: "",

      loadLoras: async (sessionId: string) => {
        if (get().isLoading) return;

        set({ isLoading: true, error: null });

        try {
          const response = await listModels({ subtype: "LoRA" }, sessionId);
          set({
            availableLoras: response.files,
            isLoaded: true,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load LoRAs",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      selectLora: (lora: ModelData) => {
        const { selectedLoras, weightPrefs, confinementPrefs } = get();

        // Clean the name (remove .safetensors extension if present)
        const name = lora.name.replace(/\.safetensors$/i, "");

        // Don't add if already selected
        if (selectedLoras.some((l) => l.name === name)) return;

        // Get default weight from model or preferences (ensure valid number)
        let defaultWeight = weightPrefs[name] ?? 1;
        if (lora.lora_default_weight !== undefined) {
          const parsed = parseFloat(String(lora.lora_default_weight));
          if (!Number.isNaN(parsed)) defaultWeight = parsed;
        }

        let defaultConfinement = confinementPrefs[name] ?? 0;
        if (lora.lora_default_confinement !== undefined) {
          const parsed = parseInt(String(lora.lora_default_confinement));
          if (!Number.isNaN(parsed)) defaultConfinement = parsed;
        }

        const newLora: SelectedLora = {
          name,
          weight: defaultWeight,
          confinement: defaultConfinement,
          model: lora,
        };

        set({ selectedLoras: [...selectedLoras, newLora] });
        get().syncToParams();
      },

      deselectLora: (name: string) => {
        set((state) => ({
          selectedLoras: state.selectedLoras.filter((l) => l.name !== name),
        }));
        get().syncToParams();
      },

      toggleLora: (lora: ModelData) => {
        const name = lora.name.replace(/\.safetensors$/i, "");
        if (get().isSelected(name)) {
          get().deselectLora(name);
        } else {
          get().selectLora(lora);
        }
      },

      setWeight: (name: string, weight: number) => {
        set((state) => ({
          selectedLoras: state.selectedLoras.map((l) =>
            l.name === name ? { ...l, weight } : l
          ),
          weightPrefs: { ...state.weightPrefs, [name]: weight },
        }));
        get().syncToParams();
      },

      setConfinement: (name: string, confinement: number) => {
        set((state) => ({
          selectedLoras: state.selectedLoras.map((l) =>
            l.name === name ? { ...l, confinement } : l
          ),
          confinementPrefs: { ...state.confinementPrefs, [name]: confinement },
        }));
        get().syncToParams();
      },

      clearAll: () => {
        set({ selectedLoras: [] });
        get().syncToParams();
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      isSelected: (name: string) => {
        const cleanName = name.replace(/\.safetensors$/i, "");
        return get().selectedLoras.some((l) => l.name === cleanName);
      },

      getFilteredLoras: () => {
        const { availableLoras, searchQuery } = get();
        if (!searchQuery) return availableLoras;

        const query = searchQuery.toLowerCase();
        return availableLoras.filter(
          (lora) =>
            lora.name.toLowerCase().includes(query) ||
            lora.title?.toLowerCase().includes(query) ||
            lora.description?.toLowerCase().includes(query)
        );
      },

      syncToParams: () => {
        const { selectedLoras } = get();
        const { setValue } = useParametersStore.getState();

        // Build comma-separated strings for the parameters
        // Ensure valid values (default weight=1, confinement=0)
        const loraNames = selectedLoras.map((l) => l.name);
        const loraWeights = selectedLoras.map((l) =>
          Number.isNaN(l.weight) || l.weight === undefined ? 1 : l.weight
        );
        const loraConfinements = selectedLoras.map((l) =>
          Number.isNaN(l.confinement) || l.confinement === undefined ? 0 : l.confinement
        );

        // Only include confinement if any non-zero values
        const hasConfinement = loraConfinements.some((c) => c !== 0);

        setValue("loras", loraNames.join(","));
        setValue("loraweights", loraWeights.join(","));
        if (hasConfinement) {
          setValue("lorasectionconfinement", loraConfinements.join(","));
        } else {
          setValue("lorasectionconfinement", "");
        }
      },

      syncFromParams: () => {
        const { values } = useParametersStore.getState();
        const { availableLoras, weightPrefs, confinementPrefs } = get();

        const loraNames = String(values.loras || "")
          .split(",")
          .filter(Boolean);
        const loraWeights = String(values.loraweights || "")
          .split(",")
          .map((w) => parseFloat(w) || 1);
        const loraConfinements = String(values.lorasectionconfinement || "")
          .split(",")
          .map((c) => parseInt(c) || 0);

        const selectedLoras: SelectedLora[] = loraNames.map((name, i) => {
          const model = availableLoras.find(
            (l) => l.name === name || l.name === `${name}.safetensors`
          );
          return {
            name,
            weight: loraWeights[i] ?? weightPrefs[name] ?? 1,
            confinement: loraConfinements[i] ?? confinementPrefs[name] ?? 0,
            model,
          };
        });

        set({ selectedLoras });
      },
    }),
    {
      name: "swarm-loras",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        weightPrefs: state.weightPrefs,
        confinementPrefs: state.confinementPrefs,
      }),
    }
  )
);
