export type ClassStatus = "not_started" | "ongoing" | "completed" | "cancelled";
export type SessionStatus = "scheduled" | "in_progress" | "completed" | "awaiting_log" | "cancelled";
export type Slot = { weekday: number; start_minute: number; end_minute: number };
export type StudyClass = {
  id: number; code: string; program_id: number; offering_id: number; status: string;
  class_type: "private" | "group"; teaching_language: string; first_date: string;
  capacity: number; session_count?: number; duration_minutes?: number;
  teacher?: { id: number; full_name: string; email: string } | null;
  slots: Slot[]; student_ids: string[]; student_names: string[];
};
export type Session = {
  id: number; class_id: number; session_number: number; starts_at: string; ends_at: string; status: string;
  zoom_account?: { name: string; email: string } | null;
  operations?: { teaching_log: string | null; late_reason: string | null; submitted_at: string | null; attendance_report_completed: boolean } | null;
  student_attendance?: { student_user_id: string; student_name: string; status: string | null; note: string | null }[];
};
export type ClassesOverview = {
  classes: StudyClass[]; sessions: Session[];
  programs: { id: number; subject: string; program: string; teaching_language: string; session_count: number; duration_minutes: number }[];
  subjects: { id: number; name: string }[];
};

export type ClassSummary = Omit<StudyClass, "slots"> & {
  subject_name: string; lifecycle_status: ClassStatus;
  first_start: string | null; last_end: string | null;
  active_sessions: number; completed_sessions: number; awaiting_logs: number;
};
export type ClassesList = {
  items: ClassSummary[]; total: number; page: number; page_size: number;
  stats: { total: number; not_started: number; ongoing: number; completed: number; cancelled: number };
  subjects: { id: number; name: string }[];
};
export type ClassListQuery = {
  page: number; pageSize: number; search: string;
  classType: string | null; status: string | null; offeringId: string | null;
};
