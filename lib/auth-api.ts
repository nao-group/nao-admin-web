import type { AdminSession } from "@/lib/admin-access";

export class AuthApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly data: Record<string, unknown> = {}) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function parseResponse(response: Response): Promise<AdminSession> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AuthApiError(
      body.detail ?? body.message ?? "Tidak dapat terhubung ke layanan login.",
      response.status,
      body,
    );
  }
  return body as AdminSession;
}

export type LoginDevice = { session_id: string; device: string; created_at: string };
export type MaxDevicesPayload = { login_token: string; sessions: LoginDevice[] };

export async function revokeAdminDevice(loginToken: string, sessionId: string): Promise<AdminSession> {
  const response = await fetch("/api/auth/sessions/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login_token: loginToken, session_id: sessionId }),
  });
  return parseResponse(response);
}

export async function loginAdmin(email: string, password: string): Promise<AdminSession> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseResponse(response);
}

export async function getAdminSession(): Promise<AdminSession> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  return parseResponse(response);
}

export async function logoutAdmin(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
