export type Member = {
  id: string;
  name: string;
  email: string;
  product: "ThinkNAO" | "StudyNAO";
  plan: string;
  status: "Active" | "Trial" | "Inactive";
  joined: string;
};

export type Payment = {
  id: string;
  member: string;
  product: "ThinkNAO" | "StudyNAO";
  amount: number;
  status: "Paid" | "Pending" | "Failed" | "Refunded";
  date: string;
  method: string;
};

export type BannerStatus = "Active" | "Scheduled" | "Draft" | "Expired";

export type Banner = {
  id: number;
  name: string;
  imageUrl: string;
  fileName: string;
  redirectUrl: string;
  status: BannerStatus;
  startsAt: string;
  endsAt: string;
};

export type Referral = {
  id: number;
  code: string;
  owner: string;
  discount: number;
  uses: number;
  limit: number;
  status: "Active" | "Paused" | "Expired";
  expiresAt: string;
};

export type EmailCampaign = {
  id: number;
  subject: string;
  recipient: string;
  audience: "Individual" | "Blast";
  status: "Sent" | "Scheduled" | "Draft";
  sentAt: string;
  openRate: number | null;
};
