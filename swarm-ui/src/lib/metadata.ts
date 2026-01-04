import type { ImageMetadata } from "@/types/api";

/**
 * Extract generation config from image metadata.
 * Handles both nested (sui_image_params) and flat metadata structures.
 * Returns values ready to be passed to useParametersStore.setValues()
 */
export function extractConfigFromMetadata(metadata: ImageMetadata): Record<string, unknown> {
  // Handle nested sui_image_params or flat structure
  const params = (metadata.sui_image_params || metadata.Sui_image_params || metadata) as Record<string, unknown>;

  const config: Record<string, unknown> = {};

  // Core text params
  if (params.prompt) config.prompt = params.prompt;
  if (params.negativeprompt) config.negativeprompt = params.negativeprompt;

  // Model
  if (params.model) config.model = params.model;

  // Numeric params
  if (params.seed !== undefined) config.seed = params.seed;
  if (params.steps !== undefined) config.steps = params.steps;
  if (params.cfgscale !== undefined) config.cfgscale = params.cfgscale;
  if (params.width !== undefined) config.width = params.width;
  if (params.height !== undefined) config.height = params.height;

  // Sampler/scheduler
  if (params.sampler) config.sampler = params.sampler;
  if (params.scheduler) config.scheduler = params.scheduler;

  // LoRAs - convert arrays to comma-separated strings (format expected by parameters store)
  const loras = params.loras as string[] | undefined;
  const loraweights = params.loraweights as (string | number)[] | undefined;

  if (Array.isArray(loras) && loras.length > 0) {
    config.loras = loras.join(",");
  }
  if (Array.isArray(loraweights) && loraweights.length > 0) {
    config.loraweights = loraweights.join(",");
  }

  // Handle any other params that might be in metadata
  // Common optional params
  const optionalParams = [
    "aspectratio", "initimage", "maskimage", "initimagecreativity",
    "refinermodel", "refinercontrolpercentage", "refinermethodstep",
    "videomaxframes", "videofps", "videoboomerang",
  ];

  for (const key of optionalParams) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      config[key] = params[key];
    }
  }

  return config;
}
