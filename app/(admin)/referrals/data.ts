import type { Referral } from "@/types/admin";

export const initialReferrals: Referral[] = [
  { id: 1, code: "NAOFAMILY", owner: "NAO Group", discount: 15, uses: 148, limit: 500, status: "Active", expiresAt: "2026-12-31" },
  { id: 2, code: "CAMPUS25", owner: "Campus Partners", discount: 25, uses: 87, limit: 200, status: "Active", expiresAt: "2026-10-31" },
  { id: 3, code: "EARLYBIRD", owner: "Growth Team", discount: 10, uses: 300, limit: 300, status: "Expired", expiresAt: "2026-08-31" },
];
