"use client";

import { create } from "zustand";
import type { ServerStatus, ServerResourceInfo } from "@/types/api";
import { getCurrentStatus, getServerResourceInfo } from "@/lib/api";

interface StatusState {
  // Server status
  waitingGens: number;
  loadingModels: number;
  liveGens: number;
  waitingBackends: number;
  supportedFeatures: string[];

  // Resource info
  resourceInfo: ServerResourceInfo | null;

  // Polling state
  isPolling: boolean;
  pollInterval: number;
  lastPollTime: number | null;
  error: string | null;

  // Actions
  fetchStatus: (sessionId: string) => Promise<void>;
  fetchResourceInfo: (sessionId: string) => Promise<void>;
  startPolling: (sessionId: string, interval?: number) => void;
  stopPolling: () => void;
  updateFromWSMessage: (message: Partial<ServerStatus>) => void;
  hasFeature: (feature: string) => boolean;
}

let pollTimeoutId: NodeJS.Timeout | null = null;

export const useStatusStore = create<StatusState>((set, get) => ({
  // Initial state
  waitingGens: 0,
  loadingModels: 0,
  liveGens: 0,
  waitingBackends: 0,
  supportedFeatures: [],
  resourceInfo: null,
  isPolling: false,
  pollInterval: 2000,
  lastPollTime: null,
  error: null,

  fetchStatus: async (sessionId: string) => {
    try {
      const status = await getCurrentStatus(sessionId);

      set({
        waitingGens: status.waiting_gens,
        loadingModels: status.loading_models,
        liveGens: status.live_gens,
        waitingBackends: status.waiting_backends,
        supportedFeatures: status.supported_features,
        lastPollTime: Date.now(),
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch status",
      });
    }
  },

  fetchResourceInfo: async (sessionId: string) => {
    try {
      const info = await getServerResourceInfo(sessionId);
      set({ resourceInfo: info });
    } catch (error) {
      console.error("Failed to fetch resource info:", error);
    }
  },

  startPolling: (sessionId: string, interval: number = 2000) => {
    const { isPolling } = get();

    if (isPolling) {
      return;
    }

    set({ isPolling: true, pollInterval: interval });

    const poll = async () => {
      if (!get().isPolling) {
        return;
      }

      await get().fetchStatus(sessionId);

      // Adjust poll interval based on activity
      const { waitingGens, liveGens, loadingModels } = get();
      let nextInterval = interval;

      if (waitingGens > 0 || liveGens > 0 || loadingModels > 0) {
        // More frequent polling during activity
        nextInterval = Math.max(1000, interval / 2);
      } else {
        // Less frequent when idle
        nextInterval = Math.min(60000, interval * 2);
      }

      pollTimeoutId = setTimeout(poll, nextInterval);
    };

    poll();
  },

  stopPolling: () => {
    set({ isPolling: false });

    if (pollTimeoutId) {
      clearTimeout(pollTimeoutId);
      pollTimeoutId = null;
    }
  },

  updateFromWSMessage: (message: Partial<ServerStatus>) => {
    set((state) => ({
      waitingGens: message.waiting_gens ?? state.waitingGens,
      loadingModels: message.loading_models ?? state.loadingModels,
      liveGens: message.live_gens ?? state.liveGens,
      waitingBackends: message.waiting_backends ?? state.waitingBackends,
      supportedFeatures: message.supported_features ?? state.supportedFeatures,
    }));
  },

  hasFeature: (feature: string) => {
    return get().supportedFeatures.includes(feature);
  },
}));
