"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { WSClient, WSState } from "@/lib/websocket/client";

interface UseWebSocketOptions {
  endpoint: string;
  sessionId: string | null;
  onMessage?: (data: unknown) => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  state: WSState;
  connect: (data?: Record<string, unknown>) => Promise<void>;
  disconnect: () => void;
  send: (data: Record<string, unknown>) => void;
  isConnected: boolean;
  isConnecting: boolean;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { endpoint, sessionId, onMessage, onError, autoConnect = false } = options;
  const [state, setState] = useState<WSState>("disconnected");
  const clientRef = useRef<WSClient | null>(null);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
  }, [onMessage, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const connect = useCallback(
    async (data: Record<string, unknown> = {}) => {
      if (!sessionId) {
        throw new Error("No session ID available");
      }

      // Disconnect existing connection
      clientRef.current?.disconnect();

      // Create new client
      const client = new WSClient(endpoint, {
        sessionId,
        onMessage: (msg) => onMessageRef.current?.(msg),
        onError: (err) => onErrorRef.current?.(err),
        onStateChange: setState,
      });

      clientRef.current = client;
      await client.connect(data);
    },
    [endpoint, sessionId]
  );

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setState("disconnected");
  }, []);

  const send = useCallback((data: Record<string, unknown>) => {
    if (!clientRef.current) {
      throw new Error("WebSocket not connected");
    }
    clientRef.current.send(data);
  }, []);

  // Auto-connect if enabled and session is available
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }
  }, [autoConnect, sessionId, connect]);

  return {
    state,
    connect,
    disconnect,
    send,
    isConnected: state === "connected" || state === "receiving",
    isConnecting: state === "connecting",
  };
}
