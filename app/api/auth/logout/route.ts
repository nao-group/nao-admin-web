import { NextResponse } from "next/server";
import {
  backendUrl,
  clearAdminCookies,
  getAdminTokens,
  refreshAdminAccessToken,
} from "@/lib/server/admin-session";

export async function POST() {
  const { accessToken, refreshToken } = await getAdminTokens();
  const revoke = (token: string) => fetch(backendUrl("/api/auth/logout"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => undefined);

  let response = accessToken ? await revoke(accessToken) : undefined;
  if ((!response || response.status === 401) && refreshToken) {
    const refreshedToken = await refreshAdminAccessToken(refreshToken).catch(() => null);
    if (refreshedToken) response = await revoke(refreshedToken);
  }
  await clearAdminCookies();
  return NextResponse.json({ message: "Logged out successfully." });
}
