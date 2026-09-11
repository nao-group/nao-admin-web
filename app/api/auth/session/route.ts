import { NextResponse } from "next/server";
import {
  backendUrl,
  clearAdminCookies,
  getAdminTokens,
  refreshAdminAccessToken,
  setAccessCookie,
} from "@/lib/server/admin-session";

async function fetchProfile(accessToken: string): Promise<Response> {
  return fetch(backendUrl("/api/admin/auth/me"), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

export async function GET() {
  const { accessToken, refreshToken } = await getAdminTokens();
  if (!accessToken && !refreshToken) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  try {
    let response = accessToken
      ? await fetchProfile(accessToken)
      : new Response(null, { status: 401 });

    if (response.status === 401 && refreshToken) {
      const refreshedToken = await refreshAdminAccessToken(refreshToken);
      if (refreshedToken) {
        await setAccessCookie(refreshedToken);
        response = await fetchProfile(refreshedToken);
      }
    }

    const body = await response.json().catch(() => ({ detail: "Invalid session response." }));
    if (!response.ok) {
      await clearAdminCookies();
      return NextResponse.json(body, { status: response.status });
    }
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { detail: "Layanan autentikasi sedang tidak dapat dijangkau." },
      { status: 502 },
    );
  }
}
