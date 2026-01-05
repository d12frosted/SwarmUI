"use client";

import { create } from "zustand";
import { WSClient } from "@/lib/websocket/client";

export interface DownloadItem {
  id: string;
  url: string;
  name: string;
  type: string;
  status: "pending" | "downloading" | "complete" | "error";
  progress: number;
  speed: number;
  currentBytes: number;
  totalBytes: number;
  error?: string;
  metadata?: CivitaiMetadata;
  startedAt: number;
}

export interface CivitaiVersionInfo {
  id: number;
  name: string;
  baseModel?: string;
  downloadUrl: string;
  fileName?: string;
}

export interface CivitaiMetadata {
  modelId: number;
  versionId: number;
  title: string;
  versionName: string;
  author?: string;
  baseModel?: string;
  description?: string;
  triggerWords?: string[];
  tags?: string[];
  previewImage?: string;
  previewImageBase64?: string; // Base64 data URI for embedding in model metadata
  downloadUrl: string;
  modelType?: string;
  availableVersions?: CivitaiVersionInfo[]; // All available versions for picker
}

interface DownloadsState {
  downloads: DownloadItem[];
  activeClients: Map<string, WSClient>;

  // Actions
  addDownload: (download: Omit<DownloadItem, "id" | "status" | "progress" | "speed" | "currentBytes" | "totalBytes" | "startedAt">) => string;
  updateDownload: (id: string, update: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
  startDownload: (id: string, sessionId: string) => void;
  cancelDownload: (id: string) => void;
}

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  downloads: [],
  activeClients: new Map(),

  addDownload: (download) => {
    const id = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newDownload: DownloadItem = {
      ...download,
      id,
      status: "pending",
      progress: 0,
      speed: 0,
      currentBytes: 0,
      totalBytes: 0,
      startedAt: Date.now(),
    };
    set((state) => ({
      downloads: [...state.downloads, newDownload],
    }));
    return id;
  },

  updateDownload: (id, update) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, ...update } : d
      ),
    }));
  },

  removeDownload: (id) => {
    const { activeClients } = get();
    const client = activeClients.get(id);
    if (client) {
      client.disconnect();
      activeClients.delete(id);
    }
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== id),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      downloads: state.downloads.filter(
        (d) => d.status !== "complete" && d.status !== "error"
      ),
    }));
  },

  startDownload: (id, sessionId) => {
    const { downloads, updateDownload, activeClients } = get();
    const download = downloads.find((d) => d.id === id);
    if (!download) return;

    updateDownload(id, { status: "downloading" });

    const client = new WSClient("DoModelDownloadWS", {
      sessionId,
      onMessage: (data) => {
        const msg = data as Record<string, unknown>;

        // Update progress
        if (msg.current_percent !== undefined) {
          const progress = ((msg.current_percent as number) || 0) * 100;
          const speed = (msg.per_second as number) || 0;
          const currentBytes = (msg.current_bytes as number) || 0;
          const totalBytes = (msg.total_bytes as number) || 0;
          updateDownload(id, { progress, speed, currentBytes, totalBytes });
        }

        // Check for completion
        if (msg.success || msg.complete) {
          updateDownload(id, { status: "complete", progress: 100 });
          activeClients.delete(id);
        }

        // Check for error
        if (msg.error) {
          updateDownload(id, { status: "error", error: msg.error as string });
          activeClients.delete(id);
        }
      },
      onError: (error) => {
        updateDownload(id, { status: "error", error: error.message });
        activeClients.delete(id);
      },
      onStateChange: (state) => {
        if (state === "disconnected") {
          const currentDownload = get().downloads.find((d) => d.id === id);
          if (currentDownload?.status === "downloading") {
            updateDownload(id, { status: "error", error: "Connection lost" });
          }
          activeClients.delete(id);
        }
      },
    });

    activeClients.set(id, client);

    // Use the resolved download URL from metadata if available
    const downloadUrl = download.metadata?.downloadUrl || download.url;

    client.connect({
      url: downloadUrl,
      type: download.type,
      name: download.name,
      metadata: download.metadata ? JSON.stringify({
        "modelspec.title": download.metadata.title,
        "modelspec.author": download.metadata.author,
        "modelspec.description": download.metadata.description,
        "modelspec.trigger_phrase": download.metadata.triggerWords?.join("; "),
        "modelspec.tags": download.metadata.tags?.join(", "),
        // Use base64 image if available, otherwise omit (backend rejects URLs)
        ...(download.metadata.previewImageBase64 ? { "modelspec.thumbnail": download.metadata.previewImageBase64 } : {}),
      }) : undefined,
    }).catch((error) => {
      updateDownload(id, { status: "error", error: error.message });
      activeClients.delete(id);
    });
  },

  cancelDownload: (id) => {
    const { activeClients, updateDownload } = get();
    const client = activeClients.get(id);
    if (client) {
      try {
        client.send({ signal: "cancel" });
      } catch {
        // Ignore send errors
      }
      client.disconnect();
      activeClients.delete(id);
    }
    updateDownload(id, { status: "error", error: "Cancelled" });
  },
}));

// Utility functions
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return "—";
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatElapsed(startedAt: number): string {
  const elapsed = Date.now() - startedAt;
  return formatDuration(elapsed);
}

export function estimateTimeRemaining(progress: number, startedAt: number): string {
  if (progress <= 0 || progress >= 100) return "—";
  const elapsed = Date.now() - startedAt;
  // Estimate total time based on current progress
  const estimatedTotal = (elapsed / progress) * 100;
  const remaining = estimatedTotal - elapsed;
  if (remaining <= 0) return "—";
  return formatDuration(remaining);
}

export function estimateTimeRemainingFromBytes(
  currentBytes: number,
  totalBytes: number,
  speed: number
): string {
  if (totalBytes <= 0 || currentBytes >= totalBytes || speed <= 0) return "—";
  const remainingBytes = totalBytes - currentBytes;
  const remainingMs = (remainingBytes / speed) * 1000;
  return formatDuration(remainingMs);
}
