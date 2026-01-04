"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SessionData, UserData } from "@/types/api";
import { getNewSession, getMyUserData, login, logout } from "@/lib/api";

interface SessionState {
  // Session data
  sessionId: string | null;
  sessionStartTime: number | null; // Unix timestamp when session was created
  userId: string | null;
  permissions: string[];
  version: string | null;
  serverId: string | null;
  outputAppendUser: string | null;

  // User data
  userData: UserData | null;

  // State flags
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  createNewSession: () => Promise<void>;
  loginUser: (username: string, password: string) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionId: null,
      sessionStartTime: null,
      userId: null,
      permissions: [],
      version: null,
      serverId: null,
      outputAppendUser: null,
      userData: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      initialize: async () => {
        const { sessionId, isInitialized } = get();

        // Skip if already initialized with a valid session
        if (isInitialized && sessionId) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Reuse existing session if we have one (e.g., after page refresh)
          if (sessionId) {
            console.log("[Session] Reusing existing session:", sessionId);
            // Verify session is still valid by fetching user data
            try {
              const userData = await getMyUserData(sessionId);
              set({
                userData,
                isInitialized: true,
              });
              return;
            } catch {
              // Session invalid, get a new one
              console.log("[Session] Existing session invalid, creating new one");
            }
          }

          // Get new session from server
          const session = await getNewSession();
          console.log("[Session] Created new session:", session.session_id);

          set({
            sessionId: session.session_id,
            sessionStartTime: Date.now(),
            userId: session.user_id,
            permissions: session.permissions,
            version: session.version,
            serverId: session.server_id,
            outputAppendUser: session.output_append_user,
            isInitialized: true,
          });

          // Fetch user data
          const userData = await getMyUserData(session.session_id);
          set({ userData });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to initialize session",
            isInitialized: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      createNewSession: async () => {
        set({ isLoading: true, error: null });

        try {
          // Clear existing session and force create a new one
          console.log("[Session] Creating new session (user requested)");

          const session = await getNewSession();
          console.log("[Session] Created new session:", session.session_id);

          set({
            sessionId: session.session_id,
            sessionStartTime: Date.now(),
            userId: session.user_id,
            permissions: session.permissions,
            version: session.version,
            serverId: session.server_id,
            outputAppendUser: session.output_append_user,
            isInitialized: true,
          });

          // Fetch user data
          const userData = await getMyUserData(session.session_id);
          set({ userData });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to create new session",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      loginUser: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const result = await login({ username, password });

          if (!result.success) {
            set({ error: result.error || "Login failed" });
            return false;
          }

          // Re-initialize session after login
          await get().initialize();
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Login failed",
          });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      logoutUser: async () => {
        const { sessionId } = get();

        if (sessionId) {
          try {
            await logout(sessionId);
          } catch {
            // Ignore logout errors
          }
        }

        set({
          sessionId: null,
          sessionStartTime: null,
          userId: null,
          permissions: [],
          userData: null,
          isInitialized: false,
        });

        // Re-initialize to get a new anonymous session
        await get().initialize();
      },

      refreshUserData: async () => {
        const { sessionId } = get();

        if (!sessionId) {
          return;
        }

        try {
          const userData = await getMyUserData(sessionId);
          set({ userData });
        } catch (error) {
          console.error("Failed to refresh user data:", error);
        }
      },

      hasPermission: (permission: string) => {
        return get().permissions.includes(permission);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "swarm-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        sessionStartTime: state.sessionStartTime,
        userId: state.userId,
        permissions: state.permissions,
        version: state.version,
        serverId: state.serverId,
        outputAppendUser: state.outputAppendUser,
      }),
    }
  )
);
