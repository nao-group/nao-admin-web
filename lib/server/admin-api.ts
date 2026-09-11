import "server-only";
import { backendUrl, getAdminTokens, refreshAdminAccessToken, setAccessCookie } from "@/lib/server/admin-session";

export async function adminApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { accessToken, refreshToken } = await getAdminTokens();
  const requestWith = (token?: string) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(backendUrl(path), { ...init, headers, cache: "no-store" });
  };
  let response = await requestWith(accessToken);
  if (response.status === 401 && refreshToken) {
    const refreshed = await refreshAdminAccessToken(refreshToken);
    if (refreshed) { await setAccessCookie(refreshed); response = await requestWith(refreshed); }
  }
  return response;
}

export function forwardApiResponse(response: Response): Response {
  return new Response(response.body, { status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
}
