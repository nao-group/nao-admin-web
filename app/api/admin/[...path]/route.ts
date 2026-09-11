import { adminApiFetch, forwardApiResponse } from "@/lib/server/admin-api";

function target(request: Request, parts: string[]): string {
  const url = new URL(request.url);
  return `/api/admin/${parts.join("/")}${url.search}`;
}
export async function GET(request: Request, context: RouteContext<"/api/admin/[...path]">) {
  const { path } = await context.params;
  return forwardApiResponse(await adminApiFetch(target(request, path)));
}
export async function POST(request: Request, context: RouteContext<"/api/admin/[...path]">) {
  const { path } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("multipart/form-data") ? await request.formData() : await request.text();
  return forwardApiResponse(await adminApiFetch(target(request, path), { method: "POST", body,
    headers: contentType.includes("multipart/form-data") ? undefined : { "content-type": contentType || "application/json" } }));
}
export async function DELETE(request: Request, context: RouteContext<"/api/admin/[...path]">) {
  const { path } = await context.params;
  return forwardApiResponse(await adminApiFetch(target(request, path), { method: "DELETE" }));
}
