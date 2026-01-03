/**
 * Model management API endpoints
 */

import { apiRequest } from "../client";
import type { ModelData, ModelListResponse, T2IParamsResponse } from "@/types/api";

export interface ListModelsRequest {
  path?: string;
  depth?: number;
  subtype?: string;
}

export async function listModels(
  data: ListModelsRequest = {},
  sessionId: string
): Promise<ModelListResponse> {
  return apiRequest<ModelListResponse>("ListModels", {
    path: data.path ?? "",
    depth: data.depth ?? 10,
    subtype: data.subtype,
  }, { sessionId });
}

export async function describeModel(
  modelName: string,
  sessionId: string
): Promise<ModelData> {
  return apiRequest<ModelData>("DescribeModel", { model: modelName }, { sessionId });
}

export interface LoadedModelsResponse {
  models: string[];
}

export async function listLoadedModels(
  sessionId: string
): Promise<LoadedModelsResponse> {
  return apiRequest<LoadedModelsResponse>("ListLoadedModels", {}, { sessionId });
}

export async function listT2IParams(sessionId: string): Promise<T2IParamsResponse> {
  return apiRequest<T2IParamsResponse>("ListT2IParams", {}, { sessionId });
}

export async function triggerRefresh(sessionId: string): Promise<void> {
  await apiRequest("TriggerRefresh", {}, { sessionId });
}

export async function setStarredModels(
  models: string[],
  sessionId: string
): Promise<void> {
  await apiRequest("SetStarredModels", { models }, { sessionId });
}

export async function editModelMetadata(
  modelName: string,
  metadata: Record<string, unknown>,
  sessionId: string
): Promise<void> {
  await apiRequest("EditModelMetadata", {
    model: modelName,
    ...metadata,
  }, { sessionId });
}

export async function deleteModel(
  modelName: string,
  sessionId: string
): Promise<void> {
  await apiRequest("DeleteModel", { model: modelName }, { sessionId });
}

export async function getModelHash(
  modelName: string,
  sessionId: string
): Promise<{ hash: string }> {
  return apiRequest<{ hash: string }>("GetModelHash", { model: modelName }, { sessionId });
}
