import type { ClassStatus, Session, SessionStatus, StudyClass } from "./types";

export const CLASS_LABELS: Record<ClassStatus, string> = { not_started: "Not started", ongoing: "Ongoing", completed: "Completed", cancelled: "Cancelled" };
export const SESSION_LABELS: Record<SessionStatus, string> = { scheduled: "Scheduled", in_progress: "In progress", completed: "Completed", awaiting_log: "Awaiting log", cancelled: "Cancelled" };
export const COLORS = { not_started: "blue", ongoing: "yellow", completed: "teal", cancelled: "gray", scheduled: "blue", in_progress: "yellow", awaiting_log: "orange" };

export function sessionStatus(session: Session, now: number): SessionStatus {
  if (session.status === "cancelled") return "cancelled";
  if (session.status === "completed" || session.operations?.submitted_at) return "completed";
  if (now >= Date.parse(session.ends_at)) return "awaiting_log";
  return now >= Date.parse(session.starts_at) ? "in_progress" : "scheduled";
}

export function classStatus(course: StudyClass, sessions: Session[], now: number): ClassStatus {
  if (course.status === "cancelled") return "cancelled";
  if (course.status === "completed") return "completed";
  const active = sessions.filter((session) => session.status !== "cancelled");
  if (!active.length) return Date.parse(`${course.first_date}T00:00:00+07:00`) > now ? "not_started" : "ongoing";
  const first = Math.min(...active.map((session) => Date.parse(session.starts_at)));
  const last = Math.max(...active.map((session) => Date.parse(session.ends_at)));
  return now < first ? "not_started" : now >= last ? "completed" : "ongoing";
}

export function classSessions(sessions: Session[], classId: number) {
  return sessions.filter((session) => session.class_id === classId).sort((a, b) => a.session_number - b.session_number);
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" }).format(new Date(value.length === 10 ? `${value}T12:00:00+07:00` : value));
}
export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
export function sessionRange(session: Session) { return `${formatTime(session.starts_at)}–${formatTime(session.ends_at)} WIB`; }
export function slotLabel(slot: StudyClass["slots"][number]) {
  const minute = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  return `${["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][slot.weekday]} ${minute(slot.start_minute)}–${minute(slot.end_minute)} WIB`;
}
export function classHref(id: number, sessionId?: number) { return `/studynao/classes/${id}${sessionId ? `?session=${sessionId}` : ""}`; }
