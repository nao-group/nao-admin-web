"use client";

import { useEffect, useState } from "react";
import { getClassesList } from "../api";
import type { ClassesList, ClassListQuery } from "../types";

export function useClassesList(query: ClassListQuery) {
  const [result, setResult] = useState<{ key: string; data: ClassesList } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([query.page, query.pageSize, query.search, query.classType, query.status, query.offeringId, attempt]);
  useEffect(() => {
    const [page, pageSize, search, classType, status, offeringId] = JSON.parse(key);
    const controller = new AbortController();
    getClassesList({ page, pageSize, search, classType, status, offeringId }, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setResult({ key, data }); })
      .catch((cause) => { if (!controller.signal.aborted) setFailure({ key, message: cause instanceof Error ? cause.message : "Daftar kelas belum dapat dimuat." }); });
    return () => controller.abort();
  }, [key]);
  const error = failure?.key === key ? failure.message : "";
  return { data: result?.data ?? null, error, loading: result?.key !== key && !error, reload: () => setAttempt((value) => value + 1) };
}
