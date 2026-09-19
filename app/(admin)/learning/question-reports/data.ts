export type ReportStatus = "Open" | "In review" | "Resolved" | "Dismissed";
export type ReportReason = string;

export type ReportQuestion = {
  id: string;
  code: string;
  difficulty: string;
  type: string;
  promptEn: string;
  promptZh: string;
  choicesEn: Record<string, string>;
  choicesZh: Record<string, string>;
  answer: string;
  explanationEn: string;
  explanationZh: string;
  imageUrl?: string | null;
};

export type QuestionReport = {
  id: string;
  status: ReportStatus;
  reason: ReportReason;
  detail: string;
  subject: string;
  subjectCode: string;
  topic: string;
  reportedBy: string;
  reporterEmail: string;
  reportedAt: string;
  updatedAt: string;
  question: ReportQuestion | null;
};

export type ReportFilters = {
  subjects: { code: string; name: string }[];
  reasons: string[];
};

export type ReportPage = {
  items: QuestionReport[];
  total: number;
  page: number;
  pageSize: number;
};
