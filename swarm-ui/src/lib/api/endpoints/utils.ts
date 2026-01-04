/**
 * Utility API endpoints
 */

import { apiRequest } from "../client";
import type { CivitaiMetadata } from "@/stores/downloads";

/**
 * Fetch an image from a URL and convert it to a base64 data URI
 * Uses the proxy-image API route to bypass CORS restrictions
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
    if (!response.ok) {
      console.warn("Failed to fetch image:", response.status);
      return null;
    }
    const data = await response.json();
    return data.dataUri || null;
  } catch (error) {
    console.warn("Error fetching image as base64:", error);
    return null;
  }
}

export interface TokenCountResponse {
  count: number;
  error?: string;
}

/**
 * Forward a request to Civitai API via backend proxy
 */
export async function forwardMetadataRequest(
  url: string,
  sessionId: string
): Promise<{ response: unknown; error?: string }> {
  return apiRequest<{ response: unknown; error?: string }>("ForwardMetadataRequest", { url }, { sessionId });
}

/**
 * Parse a Civitai URL and extract model/version IDs
 */
export function parseCivitaiUrl(url: string): { modelId: string; versionId?: string } | null {
  // Handle civitai.green URLs
  if (url.startsWith("https://civitai.green/")) {
    url = "https://civitai.com/" + url.substring("https://civitai.green/".length);
  }

  if (!url.startsWith("https://civitai.com/")) {
    return null;
  }

  const path = url.substring("https://civitai.com/".length);
  const parts = path.split("/");

  // Format: models/{id} or models/{id}/{name}?modelVersionId={versionId}
  // Or: api/download/models/{versionId}
  if (parts[0] === "api" && parts[1] === "download" && parts[2] === "models") {
    return { modelId: "", versionId: parts[3]?.split("?")[0] };
  }

  if (parts[0] === "models") {
    const modelId = parts[1]?.split("?")[0];
    if (!modelId) return null;

    // Check for modelVersionId in query string
    const urlObj = new URL(url);
    const versionId = urlObj.searchParams.get("modelVersionId") || undefined;

    return { modelId, versionId };
  }

  return null;
}

/**
 * Parse a HuggingFace URL and fix it for downloading
 */
export function parseHuggingFaceUrl(url: string): { fixedUrl: string; filename: string } | null {
  if (!url.startsWith("https://huggingface.co/")) {
    return null;
  }

  const path = url.substring("https://huggingface.co/".length);
  let parts = path.split("/");

  // Format: org/repo/blob/branch/filepath or org/repo/resolve/branch/filepath
  if (parts.length < 5) {
    return null;
  }

  // Remove ?download=true if present
  if (parts[parts.length - 1].endsWith("?download=true")) {
    parts[parts.length - 1] = parts[parts.length - 1].replace("?download=true", "");
  }

  // Convert blob to resolve for direct download
  if (parts[2] === "blob") {
    parts[2] = "resolve";
  }

  const filename = parts.slice(4).join("/")
    .replace(".safetensors", "")
    .replace(".sft", "")
    .replace(".gguf", "");

  return {
    fixedUrl: "https://huggingface.co/" + parts.join("/"),
    filename,
  };
}

/**
 * Fetch Civitai model metadata
 */
export async function fetchCivitaiMetadata(
  modelId: string,
  versionId: string | undefined,
  sessionId: string
): Promise<CivitaiMetadata | null> {
  try {
    const result = await forwardMetadataRequest(
      `https://civitai.com/api/v1/models/${modelId}`,
      sessionId
    );

    if (!result.response || (result.response as Record<string, unknown>).error) {
      return null;
    }

    const data = result.response as Record<string, unknown>;
    const modelVersions = data.modelVersions as Array<Record<string, unknown>>;

    if (!modelVersions || modelVersions.length === 0) {
      return null;
    }

    // Find the right version
    let version = modelVersions[0];
    let file = (version.files as Array<Record<string, unknown>>)?.[0];

    if (versionId) {
      for (const vers of modelVersions) {
        const files = vers.files as Array<Record<string, unknown>>;
        for (const f of files || []) {
          if ((f.downloadUrl as string)?.endsWith(`/${versionId}`)) {
            version = vers;
            file = f;
            break;
          }
        }
      }
    } else {
      // Prefer safetensors files
      for (const vers of modelVersions) {
        const files = vers.files as Array<Record<string, unknown>>;
        for (const f of files || []) {
          const name = f.name as string;
          if (name?.endsWith(".safetensors") || name?.endsWith(".sft") || name?.endsWith(".gguf")) {
            version = vers;
            file = f;
            break;
          }
        }
      }
    }

    if (!file) {
      return null;
    }

    // Map Civitai model types to SwarmUI types
    const typeMap: Record<string, string> = {
      Checkpoint: "Stable-Diffusion",
      LORA: "LoRA",
      LoCon: "LoRA",
      LyCORIS: "LoRA",
      TextualInversion: "Embedding",
      ControlNet: "ControlNet",
      VAE: "VAE",
    };

    const images = (version.images as Array<Record<string, unknown>>)?.filter(
      (img) => img.type === "image"
    );

    let downloadUrl = file.downloadUrl as string;
    if ((file.name as string)?.endsWith(".gguf")) {
      downloadUrl += "#.gguf";
    }

    const creator = data.creator as Record<string, unknown> | undefined;

    return {
      modelId: parseInt(modelId),
      versionId: version.id as number,
      title: `${data.name} - ${version.name}`,
      versionName: version.name as string,
      author: creator?.username as string | undefined,
      baseModel: version.baseModel as string | undefined,
      description: (data.description as string) || (version.description as string),
      triggerWords: version.trainedWords as string[] | undefined,
      tags: data.tags as string[] | undefined,
      previewImage: images?.[0]?.url as string | undefined,
      downloadUrl,
      modelType: typeMap[data.type as string] || undefined,
    };
  } catch (error) {
    console.error("Failed to fetch Civitai metadata:", error);
    return null;
  }
}

export interface CountTokensOptions {
  skipPromptSyntax?: boolean;
  tokenset?: string;
  weighting?: boolean;
}

/**
 * Count CLIP-like tokens in a text prompt
 */
export async function countTokens(
  sessionId: string,
  text: string,
  options: CountTokensOptions = {}
): Promise<TokenCountResponse> {
  const { skipPromptSyntax = true, tokenset = "clip", weighting = true } = options;
  return apiRequest<TokenCountResponse>("CountTokens", {
    session_id: sessionId,
    text,
    skipPromptSyntax,
    tokenset,
    weighting,
  });
}
