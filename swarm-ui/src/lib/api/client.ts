/**
 * Typed API client for SwarmUI backend communication
 */

import type { APIResponse } from "@/types/api";

export class APIError extends Error {
  constructor(
    message: string,
    public errorId?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "APIError";
  }
}

interface RequestOptions {
  sessionId?: string;
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * Make a POST request to the SwarmUI API
 */
export async function apiRequest<T>(
  endpoint: string,
  data: object = {},
  options: RequestOptions = {}
): Promise<T> {
  const { sessionId, signal, timeout = 30000 } = options;

  // Add session_id to request body if provided
  const body = sessionId ? { ...data, session_id: sessionId } : data;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`/API/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: signal || controller.signal,
      credentials: "include", // Include cookies
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new APIError(
        `HTTP error: ${response.statusText}`,
        undefined,
        response.status
      );
    }

    const result = await response.json();

    // Check for API-level errors
    if (result.error) {
      throw new APIError(result.error, result.error_id);
    }

    return result as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new APIError("Request timeout");
    }

    throw new APIError(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
}

/**
 * Retry wrapper for API requests
 */
export async function apiRequestWithRetry<T>(
  endpoint: string,
  data: object = {},
  options: RequestOptions & { maxRetries?: number } = {}
): Promise<T> {
  const { maxRetries = 3, ...requestOptions } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiRequest<T>(endpoint, data, requestOptions);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors
      if (error instanceof APIError && error.statusCode && error.statusCode < 500) {
        throw error;
      }

      // Don't retry on session errors
      if (error instanceof APIError && error.errorId === "invalid_session_id") {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw lastError || new APIError("Max retries exceeded");
}
