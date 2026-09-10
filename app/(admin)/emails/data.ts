import type { EmailCampaign } from "@/types/admin";

export const initialEmails: EmailCampaign[] = [
  { id: 1, subject: "Your September learning report", recipient: "All active members", audience: "Blast", status: "Sent", sentAt: "2026-09-08 09:00", openRate: 68.4 },
  { id: 2, subject: "Welcome to ThinkNAO, Alya!", recipient: "alya.putri@mail.com", audience: "Individual", status: "Sent", sentAt: "2026-09-08 08:14", openRate: 100 },
  { id: 3, subject: "StudyNAO Premium is coming", recipient: "StudyNAO members", audience: "Blast", status: "Scheduled", sentAt: "2026-09-15 10:00", openRate: null },
  { id: 4, subject: "September product update", recipient: "All members", audience: "Blast", status: "Draft", sentAt: "—", openRate: null },
];
