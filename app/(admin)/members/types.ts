export type MemberStatus = "Active" | "Trial" | "Inactive" | "Pending";
export type MemberProduct = { name: string; plan: string; status: MemberStatus };

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  product: string | null;
  products?: MemberProduct[];
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
  avatar_url: string | null;
  joined: string;
  grade: string | null;
  province: string | null;
  current_school: string | null;
  dream_university: string | null;
  target_major: string | null;
  product: string | null;
  products?: MemberProduct[];
  plan: string;
  status: MemberStatus;
  history: SubscriptionHistoryEntry[];
  studynao: { role: "student" | "teacher"; status: string; profile: { whatsapp: string; study_level: string; parent_email: string | null } | null } | null;
};

export type MemberStudyClass = {
  id: number; code: string; class_type: "private" | "group"; teaching_language: string;
  subject_name: string; teacher_name: string | null; first_date: string; joined_at: string;
  first_start: string | null; last_end: string | null;
  session_count: number; duration_minutes: number; completed_sessions: number; active_sessions: number;
  lifecycle_status: "not_started" | "ongoing" | "completed" | "cancelled";
};
export type MemberStudyClassHistory = { items: MemberStudyClass[]; total: number; page: number; page_size: number };
