/**
 * Image generation API endpoints
 */

import { apiRequest } from "../client";
import type { GeneratedImage, ImageMetadata } from "@/types/api";

export interface ListImagesRequest {
  path?: string;
  depth?: number;
  sortBy?: "name" | "date";
  sortReverse?: boolean;
  offset?: number;
  limit?: number;
}

export interface ListImagesResponse {
  folders: string[];
  files: Array<{
    src: string;
    metadata?: ImageMetadata;
  }>;
}

export async function listImages(
  data: ListImagesRequest,
  sessionId: string
): Promise<ListImagesResponse> {
  return apiRequest<ListImagesResponse>("ListImages", {
    path: data.path || "",
    depth: data.depth || 1,
    sortBy: data.sortBy || "date",
    sortReverse: data.sortReverse ?? true,
    offset: data.offset || 0,
    limit: data.limit || 100,
  }, { sessionId });
}

export async function addImageToHistory(
  imageSrc: string,
  metadata: ImageMetadata,
  sessionId: string
): Promise<void> {
  await apiRequest("AddImageToHistory", {
    image: imageSrc,
    metadata,
  }, { sessionId });
}

export async function toggleImageStarred(
  imageSrc: string,
  sessionId: string
): Promise<{ starred: boolean }> {
  return apiRequest<{ starred: boolean }>("ToggleImageStarred", {
    image: imageSrc,
  }, { sessionId });
}

export async function deleteImage(
  imageSrc: string,
  sessionId: string
): Promise<void> {
  await apiRequest("DeleteImage", { image: imageSrc }, { sessionId });
}

export async function openImageFolder(
  imageSrc: string,
  sessionId: string
): Promise<void> {
  await apiRequest("OpenImageFolder", { image: imageSrc }, { sessionId });
}

export interface CountTokensResponse {
  count: number;
  tokens: string[];
}

export async function countTokens(
  text: string,
  sessionId: string
): Promise<CountTokensResponse> {
  return apiRequest<CountTokensResponse>("CountTokens", { text }, { sessionId });
}

export interface DetailedTokensResponse {
  tokens: Array<{
    text: string;
    id: number;
  }>;
}

export async function tokenizeInDetail(
  text: string,
  sessionId: string
): Promise<DetailedTokensResponse> {
  return apiRequest<DetailedTokensResponse>("TokenizeInDetail", { text }, { sessionId });
}
