import type { QuestionReport, ReportFilters, ReportPage, ReportQuestion, ReportStatus } from "./data";

type RawReport = Record<string, unknown>;

async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? "Request failed");
  return body as T;
}

const statusFromApi: Record<string, ReportStatus> = { open: "Open", reviewing: "In review", resolved: "Resolved", dismissed: "Dismissed" };
const statusToApi: Record<ReportStatus, string> = { Open: "open", "In review": "reviewing", Resolved: "resolved", Dismissed: "dismissed" };

function prompt(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const value = (content as Record<string, unknown>).question;
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).filter((item): item is string => typeof item === "string").join("\n");
  return "";
}

function choices(content: unknown, fallback: unknown): Record<string, string> {
  if (content && typeof content === "object") {
    const row = content as Record<string, unknown>;
    const value = row.answer ?? row.choices;
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  }
  if (fallback && typeof fallback === "object") return Object.fromEntries(Object.entries(fallback as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  return {};
}

function mapReport(raw: RawReport): QuestionReport {
  const questionId = typeof raw.question_id === "string" ? raw.question_id : "";
  const question: ReportQuestion | null = questionId ? {
    id: questionId, code: String(raw.question_code ?? "Unknown question"), difficulty: String(raw.difficulty ?? "—"),
    type: String(raw.question_type ?? "Question"), promptEn: prompt(raw.content_en), promptZh: prompt(raw.content_zh),
    choicesEn: choices(raw.content_en, raw.choices), choicesZh: choices(raw.content_zh, raw.choices),
    answer: String(raw.answer ?? ""), explanationEn: String(raw.explanation_en ?? ""), explanationZh: String(raw.explanation_zh ?? ""),
    imageUrl: typeof raw.image_url === "string" ? raw.image_url : null,
  } : null;
  return {
    id: String(raw.id), status: statusFromApi[String(raw.status)] ?? "Open", reason: String(raw.reason ?? "Other"),
    detail: String(raw.details ?? "No additional details were provided."), subject: String(raw.subject_name ?? "Unknown subject"),
    subjectCode: String(raw.subject_code ?? ""), topic: String(raw.topic_name ?? "Unknown topic"),
    reportedBy: String(raw.reported_by ?? "Unknown member"), reporterEmail: String(raw.reporter_email ?? ""),
    reportedAt: String(raw.created_at), updatedAt: String(raw.updated_at ?? raw.created_at), question,
  };
}

export async function getReports(params: { page: number; search: string; status: string; reason: string; subject: string }, signal?: AbortSignal): Promise<ReportPage> {
  const query = new URLSearchParams({ page: String(params.page), page_size: "20", search: params.search,
    status: params.status === "All status" ? "" : statusToApi[params.status as ReportStatus] ?? "",
    reason: params.reason === "All reasons" ? "" : params.reason,
    subject: params.subject === "All subjects" ? "" : params.subject, _: String(Date.now()) });
  const raw = await result<{ items: RawReport[]; total: number; page: number; page_size: number }>(await fetch(`/api/admin/question-reports?${query}`, { cache: "no-store", signal }));
  return { items: raw.items.map(mapReport), total: raw.total, page: raw.page, pageSize: raw.page_size };
}

export async function getReportFilters(): Promise<ReportFilters> {
  return result(await fetch("/api/admin/question-reports/filters", { cache: "no-store" }));
}

export async function setReportStatus(reportId: string, status: ReportStatus): Promise<QuestionReport> {
  return mapReport(await result<RawReport>(await fetch(`/api/admin/question-reports/${reportId}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: statusToApi[status] }),
  })));
}

export async function saveReportedQuestion(reportId: string, question: ReportQuestion): Promise<QuestionReport> {
  return mapReport(await result<RawReport>(await fetch(`/api/admin/question-reports/${reportId}/question`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      content_en: { question: question.promptEn, answer: question.choicesEn }, content_zh: { question: question.promptZh, answer: question.choicesZh },
      answer: question.answer, explanation_en: question.explanationEn, explanation_zh: question.explanationZh,
    }),
  })));
}

export async function replaceReportedImage(reportId: string, file: File): Promise<QuestionReport> {
  const form = new FormData(); form.set("file", file);
  return mapReport(await result<RawReport>(await fetch(`/api/admin/question-reports/${reportId}/question/image`, { method: "POST", body: form })));
}

export async function removeReportedImage(reportId: string): Promise<QuestionReport> {
  return mapReport(await result<RawReport>(await fetch(`/api/admin/question-reports/${reportId}/question/image`, { method: "DELETE" })));
}
