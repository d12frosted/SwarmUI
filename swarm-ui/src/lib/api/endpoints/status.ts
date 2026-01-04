/**
 * Server status API endpoints
 */

import { apiRequest } from "../client";
import type { ServerStatus, ServerResourceInfo, ActiveGenerationsResponse } from "@/types/api";

export async function getCurrentStatus(sessionId: string): Promise<ServerStatus> {
  return apiRequest<ServerStatus>("GetCurrentStatus", {}, { sessionId });
}

export async function getServerResourceInfo(
  sessionId: string
): Promise<ServerResourceInfo> {
  return apiRequest<ServerResourceInfo>("GetServerResourceInfo", {}, { sessionId });
}

export interface GlobalStatus {
  total_waiting: number;
  total_live: number;
  total_backends: number;
  backends_available: number;
}

export async function getGlobalStatus(sessionId: string): Promise<GlobalStatus> {
  return apiRequest<GlobalStatus>("GetGlobalStatus", {}, { sessionId });
}

export async function interruptAll(sessionId: string): Promise<void> {
  await apiRequest("InterruptAll", {}, { sessionId });
}

export async function getActiveGenerations(sessionId: string): Promise<ActiveGenerationsResponse> {
  return apiRequest<ActiveGenerationsResponse>("GetActiveGenerations", {}, { sessionId });
}
