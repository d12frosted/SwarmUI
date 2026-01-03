/**
 * Session & Authentication API endpoints
 */

import { apiRequest } from "../client";
import type { SessionData, UserData } from "@/types/api";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("Login", data);
}

export async function logout(sessionId: string): Promise<void> {
  await apiRequest("Logout", {}, { sessionId });
}

export async function getNewSession(): Promise<SessionData> {
  return apiRequest<SessionData>("GetNewSession");
}

export async function getMyUserData(sessionId: string): Promise<UserData> {
  return apiRequest<UserData>("GetMyUserData", {}, { sessionId });
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export async function changePassword(
  data: ChangePasswordRequest,
  sessionId: string
): Promise<{ success: boolean }> {
  return apiRequest("ChangePassword", {
    old_password: data.oldPassword,
    new_password: data.newPassword,
  }, { sessionId });
}
