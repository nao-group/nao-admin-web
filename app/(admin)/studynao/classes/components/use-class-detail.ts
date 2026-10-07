"use client";

import { useEffect, useState } from "react";
import { getClassDetail } from "../api";
import type { ClassesOverview } from "../types";

export function useClassDetail(classId: number) {
  const [data, setData] = useState<ClassesOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const controller = new AbortController();
    getClassDetail(classId, controller.signal).then((value) => {
      if (!controller.signal.aborted) { setData(value); setError(""); setNow(Date.now()); }
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Daftar kelas belum dapat dimuat.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt, classId]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  function reload() { setLoading(true); setError(""); setAttempt((value) => value + 1); }
  return { data, error, loading, now, reload };
}
