/**
 * Utility API endpoints
 */

import { apiRequest } from "../client";

export interface TokenCountResponse {
  count: number;
  error?: string;
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
