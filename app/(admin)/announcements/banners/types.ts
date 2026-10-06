export type BannerStatus = "Active" | "Scheduled" | "Draft" | "Expired";

export type Banner = {
  id: number;
  name: string;
  imageUrl: string;
  fileName: string;
  redirectUrl: string;
  status: BannerStatus;
  startsAt: string | null;
  endsAt: string | null;
  // Currently shown to members: active, or scheduled and inside its window.
  isLive: boolean;
};

export type BannerWritePayload = {
  name: string;
  redirectUrl: string;
  // "Expired" is assigned by the system when a scheduled window ends, never chosen.
  status: Exclude<BannerStatus, "Expired">;
  startsAt: string | null;
  endsAt: string | null;
  image: File | null;
};
