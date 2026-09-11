import type { ExtractionJob, ExtractorReadiness, PageResult, ProviderKeyUpdate, ProviderName, ProviderSettings, QuestionDetail, QuestionSummary } from "./types";
export class QuestionExtractionError extends Error {}
async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new QuestionExtractionError(body.detail ?? "Request failed. Please try again.");
  return body as T;
}
export async function createExtraction(subject: string, files: File[]): Promise<ExtractionJob> {
  const form = new FormData(); form.set("subject", subject); files.forEach((file) => form.append("files", file, file.webkitRelativePath || file.name));
  return result(await fetch("/api/admin/question-extractions", { method: "POST", body: form }));
}
export async function getJobs(page = 1): Promise<PageResult<ExtractionJob>> {
  return result(await fetch(`/api/admin/question-extractions?page=${page}&page_size=10`, { cache: "no-store" }));
}
export async function getExtractorReadiness(): Promise<ExtractorReadiness> {
  return result(await fetch("/api/admin/question-extractions/config/readiness", { cache: "no-store" }));
}
export async function getProviderSettings(): Promise<ProviderSettings> {
  return result(await fetch("/api/admin/question-extractions/config/providers", { cache: "no-store" }));
}
export async function saveProviderSettings(providers: Record<ProviderName, ProviderKeyUpdate>): Promise<ProviderSettings> {
  return result(await fetch("/api/admin/question-extractions/config/providers", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(providers),
  }));
}
export async function getJob(id: string): Promise<ExtractionJob> {
  return result(await fetch(`/api/admin/question-extractions/${id}`, { cache: "no-store" }));
}
export async function cancelJob(id: string): Promise<void> {
  await result(await fetch(`/api/admin/question-extractions/${id}`, { method: "DELETE" }));
}
export async function resumeJob(id: string): Promise<ExtractionJob> {
  return result(await fetch(`/api/admin/question-extractions/${id}/resume`, { method: "POST" }));
}
export async function getQuestions(jobId: string, page = 1, search = ""): Promise<PageResult<QuestionSummary>> {
  const params = new URLSearchParams({ page: String(page), page_size: "20", search });
  return result(await fetch(`/api/admin/question-extractions/${jobId}/questions?${params}`, { cache: "no-store" }));
}
export async function getQuestion(jobId: string, questionId: string): Promise<QuestionDetail> {
  return result(await fetch(`/api/admin/question-extractions/${jobId}/questions/${questionId}`, { cache: "no-store" }));
}
export async function deleteQuestions(jobId: string, questionIds: string[]): Promise<{ deleted: number }> {
  return result(await fetch(`/api/admin/question-extractions/${jobId}/questions/bulk-delete`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question_ids: questionIds }),
  }));
}
export async function reprocessQuestions(jobId: string, questionIds: string[]): Promise<ExtractionJob> {
  return result(await fetch(`/api/admin/question-extractions/${jobId}/questions/reprocess`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question_ids: questionIds }),
  }));
}
