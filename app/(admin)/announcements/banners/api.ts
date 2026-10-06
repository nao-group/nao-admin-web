import type { Banner, BannerStatus, BannerWritePayload } from "./types";

export class BannerApiError extends Error {}

type BannerDto = {
  id: number; name: string; image_url: string; file_name: string; redirect_url: string | null;
  status: "draft" | "scheduled" | "active" | "expired"; starts_at: string | null; ends_at: string | null; is_live: boolean;
};

const STATUS_LABELS: Record<BannerDto["status"], BannerStatus> = {
  draft: "Draft", scheduled: "Scheduled", active: "Active", expired: "Expired",
};

async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === "string" ? body.detail : "Permintaan gagal. Silakan coba lagi.";
    throw new BannerApiError(detail);
  }
  return body as T;
}

function fromDto(dto: BannerDto): Banner {
  return {
    id: dto.id, name: dto.name, imageUrl: dto.image_url, fileName: dto.file_name, redirectUrl: dto.redirect_url ?? "",
    status: STATUS_LABELS[dto.status], startsAt: dto.starts_at, endsAt: dto.ends_at, isLive: dto.is_live,
  };
}

function toForm(payload: BannerWritePayload): FormData {
  const form = new FormData();
  form.set("name", payload.name);
  form.set("status", payload.status.toLowerCase());
  if (payload.redirectUrl) form.set("redirect_url", payload.redirectUrl);
  if (payload.status === "Scheduled" && payload.startsAt && payload.endsAt) {
    form.set("starts_at", payload.startsAt);
    form.set("ends_at", payload.endsAt);
  }
  if (payload.image) form.set("image", payload.image);
  return form;
}

export async function listBanners(): Promise<Banner[]> {
  return (await result<BannerDto[]>(await fetch("/api/admin/content/banners", { cache: "no-store" }))).map(fromDto);
}

export async function createBanner(payload: BannerWritePayload): Promise<Banner> {
  return fromDto(await result<BannerDto>(await fetch("/api/admin/content/banners", { method: "POST", body: toForm(payload) })));
}

export async function updateBanner(id: number, payload: BannerWritePayload): Promise<Banner> {
  return fromDto(await result<BannerDto>(await fetch(`/api/admin/content/banners/${id}`, { method: "PUT", body: toForm(payload) })));
}

export async function deleteBanner(id: number): Promise<void> {
  await result(await fetch(`/api/admin/content/banners/${id}`, { method: "DELETE" }));
}

/** Persists the carousel order; `ids` must contain every banner exactly once. Returns the fresh, ordered list. */
export async function reorderBanners(ids: number[]): Promise<Banner[]> {
  const response = await fetch("/api/admin/content/banners/order", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids }),
  });
  return (await result<BannerDto[]>(response)).map(fromDto);
}
