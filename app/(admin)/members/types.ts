export type MemberStatus = "Active" | "Trial" | "Inactive";

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  product: string | null;
  plan: string;
  status: MemberStatus;
  joined: string;
};

export type MemberListResult = { items: MemberRow[]; total: number; page: number; page_size: number };

export type MemberStats = {
  year: number;
  month: number;
  total_members: number;
  active_paid_members: number;
  active_paid_members_delta_pct: number | null;
  new_this_month: number;
  new_this_month_delta_pct: number | null;
  trial_conversion_pct: number;
  trial_conversion_delta_pct: number | null;
};

export type MemberGrowth = { year: number; labels: string[]; values: number[] };

export type ProductDistributionItem = { product_id: string; name: string; count: number; percentage: number };
export type ProductDistribution = { items: ProductDistributionItem[]; total: number };

export type SubscriptionHistoryEntry = { plan_name: string; start: string; end: string | null };

export type MemberDetail = {
  id: string;
  name: string;
  email: string;
  joined: string;
  product: string | null;
  plan: string;
  status: MemberStatus;
  history: SubscriptionHistoryEntry[];
};
