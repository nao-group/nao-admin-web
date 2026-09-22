import { adminApiFetch, forwardApiResponse } from "@/lib/server/admin-api";

export async function GET() {
  return forwardApiResponse(await adminApiFetch("/api/onboarding/provinces"));
}
