"use client";

import { useState, useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/session";
import { countTokens } from "@/lib/api";

interface UseTokenCountOptions {
  debounceMs?: number;
  skipPromptSyntax?: boolean;
}

/**
 * Hook to count CLIP tokens in a text with debouncing
 */
export function useTokenCount(
  text: string,
  options: UseTokenCountOptions = {}
): number | undefined {
  const { debounceMs = 300, skipPromptSyntax = true } = options;
  const { sessionId } = useSessionStore();
  const [tokenCount, setTokenCount] = useState<number | undefined>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef<string>("");

  useEffect(() => {
    // Clear pending request
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't count empty text
    if (!text.trim()) {
      setTokenCount(0);
      return;
    }

    // Don't recount if text hasn't changed
    if (text === lastTextRef.current) {
      return;
    }

    // Don't count without session
    if (!sessionId) {
      return;
    }

    // Debounce the API call
    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await countTokens(sessionId, text, { skipPromptSyntax });
        if (!result.error) {
          setTokenCount(result.count);
          lastTextRef.current = text;
        }
      } catch (error) {
        console.error("Failed to count tokens:", error);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, sessionId, debounceMs, skipPromptSyntax]);

  return tokenCount;
}
