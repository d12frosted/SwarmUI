"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useSessionStore } from "@/stores/session";
import { useStatusStore } from "@/stores/status";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

function SessionInitializer({ children }: { children: React.ReactNode }) {
  const { initialize, isInitialized, sessionId } = useSessionStore();
  const { startPolling, stopPolling } = useStatusStore();

  // Initialize session on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Start status polling when session is available
  useEffect(() => {
    if (isInitialized && sessionId) {
      startPolling(sessionId);
    }

    return () => {
      stopPolling();
    };
  }, [isInitialized, sessionId, startPolling, stopPolling]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionInitializer>{children}</SessionInitializer>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
