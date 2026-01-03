/**
 * Preset API endpoints
 */

import { apiRequest } from "../client";

export interface Preset {
  title: string;
  description: string;
  param_map: Record<string, string>;
  preview_image?: string;
  author?: string;
}

export interface UserDataResponse {
  user_name: string;
  presets: Preset[];
  language: string;
  permissions: string[];
  starred_models: Record<string, string[]>;
  model_preset_links: Record<string, Record<string, string[]>>;
  autocompletions: string[] | null;
}

export interface PresetResponse {
  success?: boolean;
  preset_fail?: string;
}

/**
 * Get user data including presets
 */
export async function getUserData(sessionId: string): Promise<UserDataResponse> {
  return apiRequest<UserDataResponse>("GetMyUserData", { session_id: sessionId });
}

/**
 * Add or edit a preset
 */
export async function addPreset(
  sessionId: string,
  title: string,
  description: string,
  paramMap: Record<string, string>,
  previewImage?: string,
  isEdit = false,
  editing?: string
): Promise<PresetResponse> {
  return apiRequest<PresetResponse>("AddNewPreset", {
    session_id: sessionId,
    title,
    description,
    param_map: paramMap,
    preview_image: previewImage,
    is_edit: isEdit,
    editing,
  });
}

/**
 * Delete a preset
 */
export async function deletePreset(sessionId: string, preset: string): Promise<PresetResponse> {
  return apiRequest<PresetResponse>("DeletePreset", {
    session_id: sessionId,
    preset,
  });
}

/**
 * Duplicate a preset
 */
export async function duplicatePreset(sessionId: string, preset: string): Promise<PresetResponse> {
  return apiRequest<PresetResponse>("DuplicatePreset", {
    session_id: sessionId,
    preset,
  });
}

/**
 * Set model-preset links
 */
export async function setPresetLinks(
  sessionId: string,
  links: Record<string, Record<string, string[]>>
): Promise<{ success: boolean }> {
  return apiRequest("SetPresetLinks", {
    session_id: sessionId,
    ...links,
  });
}
