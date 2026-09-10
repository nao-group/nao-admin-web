import type { Banner } from "@/types/admin";

export const initialBanners: Banner[] = [
  { id: 1, name: "September Mock Exam", imageUrl: "", fileName: "mock-exam-september.png", redirectUrl: "/mock-exam", status: "Active", startsAt: "2026-09-01T00:00", endsAt: "2026-09-30T23:59" },
  { id: 2, name: "StudyNAO Premium Launch", imageUrl: "", fileName: "studynao-premium.jpg", redirectUrl: "https://naogroup.com/studynao", status: "Scheduled", startsAt: "2026-09-15T08:00", endsAt: "2026-10-01T00:00" },
];
