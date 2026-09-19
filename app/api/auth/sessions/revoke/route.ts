import { NextResponse } from "next/server";
import type { AdminSession } from "@/lib/admin-access";
import { backendUrl, setAdminCookies, type BackendLoginResponse } from "@/lib/server/admin-session";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload.login_token !== "string" || typeof payload.session_id !== "string") {
    return NextResponse.json({ detail: "Login token and device are required." }, { status: 400 });
  }
  try {
    const response = await fetch(backendUrl("/api/admin/auth/sessions/revoke"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": request.headers.get("User-Agent") ?? "NAO Admin Web" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({ detail: "Invalid authentication response." }));
    if (!response.ok) return NextResponse.json(body, { status: response.status });
    const session = body as BackendLoginResponse;
    await setAdminCookies(session);
    const safeSession: AdminSession = { user: session.user, roles: session.roles, permissions: session.permissions };
    return NextResponse.json(safeSession);
  } catch {
    return NextResponse.json({ detail: "Layanan login sedang tidak dapat dijangkau." }, { status: 502 });
  }
}
