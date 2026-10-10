export type Reimbursement = {
 id: number; purchase_date: string; amount: number; purchase_url: string | null; title: string; category: "zoom" | "api" | "software" | "other"; staff_id: number | null; requester?: { full_name: string; email: string } | null; evidence_url: string | null;
 notes: string | null; status: "pending" | "approved" | "rejected"; review_note: string | null;
 expense_id: number | null; created_at: string; staff_members?: { full_name: string; email: string };
 finance_expenses?: { status: string } | null;
};
export type ReimbursementList = { items: Reimbursement[]; total: number; page: number; page_size: number; zoom_shopee_url?: string | null };
