/**
 * Core API types for SwarmUI backend communication
 */

// Session & Authentication
export interface SessionData {
  session_id: string;
  user_id: string;
  output_append_user: string;
  permissions: string[];
  version: string;
  server_id: string;
}

export interface UserData {
  starred_models: string[];
  presets: Record<string, PresetData>;
  autocompletions: AutocompletionData[];
  language: string;
}

export interface PresetData {
  title: string;
  description: string;
  param_map: Record<string, unknown>;
  preview_image?: string;
}

export interface AutocompletionData {
  tag: string;
  count: number;
  category: string;
}

// Status
export interface ServerStatus {
  waiting_gens: number;
  loading_models: number;
  live_gens: number;
  waiting_backends: number;
  supported_features: string[];
}

export interface ServerResourceInfo {
  gpus: GPUInfo[];
  cpu: CPUInfo;
  system_ram: RAMInfo;
}

export interface GPUInfo {
  id: number;
  name: string;
  temperature: number;
  utilization_gpu: number;
  utilization_memory: number;
  total_memory: number;
  free_memory: number;
  used_memory: number;
}

export interface CPUInfo {
  usage: number;
  cores: number;
}

export interface RAMInfo {
  total: number;
  used: number;
  free: number;
}

// Active Generation (for reconnection)
export interface ActiveGeneration {
  request_id: number;
  batch_index: number;
  overall_percent: number;
  current_percent: number;
  model: string;
  start_time: number;
  waiting_gens: number;
  live_gens: number;
  preview: string | null;
}

export interface ActiveGenerationsResponse {
  generations: ActiveGeneration[];
}

// Models
export interface ModelData {
  name: string;
  title?: string;
  author?: string;
  description?: string;
  preview_image?: string;
  loaded?: boolean;
  architecture?: string;
  class?: string;
  compat_class?: string;
  resolution?: string;
  standard_width?: number;
  standard_height?: number;
  license?: string;
  date?: string;
  usage_hint?: string;
  trigger_phrase?: string;
  tags?: string[];
  is_supported_model_format?: boolean;
  hash?: string;
  // LoRA-specific fields
  lora_default_weight?: number | string;
  lora_default_confinement?: number | string;
}

export interface ModelListResponse {
  files: ModelData[];
  folders: string[];
}

// Generation Parameters
export interface T2IParamGroup {
  id: string;
  name: string;
  description?: string;
  toggles: boolean;
  open: boolean;
  priority: number;
  advanced?: boolean;
  can_shrink?: boolean;
  parent?: string;
}

export interface T2IParamType {
  id: string;
  name: string;
  description: string;
  type: "text" | "integer" | "decimal" | "boolean" | "dropdown" | "image" | "model";
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  values?: string[];
  view_type?: string;
  group?: string;
  advanced?: boolean;
  toggleable?: boolean;
  feature_flag?: string;
  visible?: boolean;
  examples?: string[];
  image_should_resize?: boolean;
}

export interface T2IParamsResponse {
  list: T2IParamType[];
  groups: T2IParamGroup[];
  models: string[];
  wildcards: string[];
  param_edits: Record<string, unknown>;
}

// Generation
export interface GenerationInput {
  session_id: string;
  prompt: string;
  negativeprompt?: string;
  model?: string;
  images?: number;
  steps?: number;
  cfgscale?: number;
  width?: number;
  height?: number;
  seed?: number;
  [key: string]: unknown;
}

export interface GenerationProgress {
  batch_index: number;
  request_id: string;
  overall_percent: number;
  current_percent: number;
  preview?: string;
  metadata?: string;
}

export interface GeneratedImage {
  image: string;
  metadata: ImageMetadata;
  batch_id: string;
}

export interface ImageMetadata {
  prompt: string;
  negativeprompt?: string;
  model: string;
  seed: number;
  steps: number;
  cfgscale: number;
  width: number;
  height: number;
  [key: string]: unknown;
}

// WebSocket image result from generation
export interface WSImageResult {
  image: string;
  batch_index: string;
  request_id: string;
  metadata: string;
}

// WebSocket message types
export interface WSMessage {
  status?: ServerStatus;
  gen_progress?: GenerationProgress;
  image?: WSImageResult | string;
  images?: WSImageResult[];
  discard_indices?: number[];
  error?: string;
  error_id?: string;
  keep_alive?: boolean;
  socket_intention?: string;
}

// API Response wrapper
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  error_id?: string;
}

// Backend types
export interface BackendData {
  id: string;
  type: string;
  status: "running" | "idle" | "disabled" | "loading" | "errored";
  settings: Record<string, unknown>;
  models_loaded: string[];
  current_model?: string;
  max_usages?: number;
  features?: string[];
}

export interface BackendType {
  id: string;
  name: string;
  description: string;
  settings: BackendSettingDef[];
}

export interface BackendSettingDef {
  name: string;
  type: string;
  description: string;
  default?: unknown;
}
