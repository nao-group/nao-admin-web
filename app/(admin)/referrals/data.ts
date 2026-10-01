import type { Referral } from "@/types/admin";

export const initialReferrals: Referral[] = [
  { id: 1, code: "NAOFAMILY", owner: "NAO Group", discountType: "Percentage", discount: 15, uses: 148, limit: 500, status: "Active", startsAt: "2026-09-01", expiresAt: "2026-12-31" },
  { id: 2, code: "CAMPUS25", owner: "Campus Partners", discountType: "Percentage", discount: 25, uses: 87, limit: 200, status: "Active", startsAt: "2026-09-01", expiresAt: "2026-10-31" },
  { id: 3, code: "EARLYBIRD", owner: "Growth Team", discountType: "Percentage", discount: 10, uses: 300, limit: 300, status: "Expired", startsAt: "2026-09-01", expiresAt: "2026-08-31" },
];
