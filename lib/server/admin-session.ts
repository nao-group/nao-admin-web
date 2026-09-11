import "server-only";

import { cookies } from "next/headers";
import type { AdminSession } from "@/lib/admin-access";

const ACCESS_COOKIE = "nao_admin_access";
const REFRESH_COOKIE = "nao_admin_refresh";
const ACCESS_MAX_AGE = 2 * 60 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

type BackendLoginResponse = AdminSession & {
  access_token: string;
  refresh_token: string;
};

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

export function backendUrl(path: string): string {
  // Auth uses a same-origin Next.js BFF. Keep the upstream API URL server-only
  // so the browser never needs direct access to the bearer-token backend.
  const baseUrl = (
    process.env.NAO_API_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? "http://localhost:8000"
  ).replace(/\/$/, "");
  return `${baseUrl}${path}`;
}

export async function setAdminCookies(session: BackendLoginResponse): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, session.access_token, cookieOptions(ACCESS_MAX_AGE));
  cookieStore.set(REFRESH_COOKIE, session.refresh_token, cookieOptions(REFRESH_MAX_AGE));
}

export async function setAccessCookie(accessToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
}

export async function getAdminTokens(): Promise<{
  accessToken?: string;
  refreshToken?: string;
}> {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(ACCESS_COOKIE)?.value,
    refreshToken: cookieStore.get(REFRESH_COOKIE)?.value,
  };
}

export async function clearAdminCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export async function refreshAdminAccessToken(refreshToken: string): Promise<string | null> {
  const response = await fetch(backendUrl("/api/auth/token/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = await response.json();
  return typeof body.access_token === "string" ? body.access_token : null;
}

export type { BackendLoginResponse };
