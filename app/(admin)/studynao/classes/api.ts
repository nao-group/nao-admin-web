import type { ClassesOverview, ClassesList, ClassListQuery } from "./types";

async function classesApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/admin/studynao/classes${path}`, { cache: "no-store", signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Daftar kelas belum dapat dimuat.");
  return body;
}

export function getClassDetail(classId: number, signal?: AbortSignal) {
  return classesApi<ClassesOverview>(`/${classId}`, signal);
}
export function getClassesList(query: ClassListQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(query.page), page_size: String(query.pageSize), search: query.search.trim() });
  if (query.classType) params.set("class_type", query.classType);
  if (query.status) params.set("status", query.status);
  if (query.offeringId) params.set("offering_id", query.offeringId);
  return classesApi<ClassesList>(`?${params}`, signal);
}
