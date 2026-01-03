/**
 * WebSocket client for SwarmUI real-time communication
 *
 * Handles generation streaming, model loading progress, and other real-time features.
 */

export type WSState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "receiving"
  | "completed"
  | "error";

export interface WSClientOptions {
  sessionId: string;
  onMessage?: (data: unknown) => void;
  onStateChange?: (state: WSState) => void;
  onError?: (error: Error) => void;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export class WSClient {
  private socket: WebSocket | null = null;
  private endpoint: string;
  private options: WSClientOptions;
  private reconnectAttempts = 0;
  private state: WSState = "disconnected";
  private aborted = false;

  constructor(endpoint: string, options: WSClientOptions) {
    this.endpoint = endpoint;
    this.options = {
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      ...options,
    };
  }

  private setState(state: WSState) {
    this.state = state;
    this.options.onStateChange?.(state);
  }

  private getWebSocketUrl(): string {
    // WebSocket connections go directly to the backend server
    // Next.js rewrites only proxy HTTP requests, not WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST || "localhost:7801";
    return `${protocol}//${backendHost}/API/${this.endpoint}`;
  }

  connect(data: Record<string, unknown> = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.aborted = false;
      this.setState("connecting");

      try {
        this.socket = new WebSocket(this.getWebSocketUrl());
      } catch (error) {
        this.setState("error");
        reject(error);
        return;
      }

      this.socket.onopen = () => {
        this.setState("connected");
        this.reconnectAttempts = 0;

        // Send initial data with session_id
        const payload = {
          ...data,
          session_id: this.options.sessionId,
        };
        this.socket?.send(JSON.stringify(payload));
        resolve();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Check for errors
          if (message.error) {
            this.setState("error");
            this.options.onError?.(new Error(message.error));

            // Handle session errors
            if (message.error_id === "invalid_session_id") {
              this.disconnect();
            }
            return;
          }

          this.setState("receiving");
          this.options.onMessage?.(message);

          // Check for completion indicators
          if (message.complete || message.done) {
            this.setState("completed");
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.socket.onerror = (event) => {
        this.setState("error");
        this.options.onError?.(new Error("WebSocket error"));
      };

      this.socket.onclose = (event) => {
        if (this.aborted) {
          this.setState("disconnected");
          return;
        }

        // Attempt reconnection if not a clean close
        if (!event.wasClean && this.shouldReconnect()) {
          this.attemptReconnect(data);
        } else {
          this.setState("disconnected");
        }
      };
    });
  }

  private shouldReconnect(): boolean {
    return (
      this.reconnectAttempts < (this.options.maxReconnectAttempts ?? 3) &&
      !this.aborted
    );
  }

  private attemptReconnect(data: Record<string, unknown>) {
    this.reconnectAttempts++;
    const delay =
      (this.options.reconnectDelay ?? 1000) *
      Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (!this.aborted) {
        this.connect(data);
      }
    }, delay);
  }

  send(data: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      throw new Error("WebSocket is not connected");
    }
  }

  disconnect() {
    this.aborted = true;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setState("disconnected");
  }

  getState(): WSState {
    return this.state;
  }
}

/**
 * Create a one-shot WebSocket request that resolves when complete
 */
export function wsRequest<T>(
  endpoint: string,
  data: Record<string, unknown>,
  sessionId: string,
  onProgress?: (message: unknown) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const messages: unknown[] = [];

    const client = new WSClient(endpoint, {
      sessionId,
      onMessage: (message) => {
        messages.push(message);
        onProgress?.(message);

        // Check for completion
        const msg = message as Record<string, unknown>;
        if (msg.complete || msg.done) {
          client.disconnect();
          resolve(messages as T);
        }
      },
      onError: (error) => {
        client.disconnect();
        reject(error);
      },
      onStateChange: (state) => {
        if (state === "completed") {
          client.disconnect();
          resolve(messages as T);
        }
      },
    });

    client.connect(data).catch(reject);
  });
}
