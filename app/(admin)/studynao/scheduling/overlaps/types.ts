export type Slot = { weekday: number; start_minute: number; end_minute: number };
export type PrivateRequest = { id: number; student_user_id: string; student?: { full_name: string; email: string }; program_id: number; offering_id: number; preferred_start_date: string; status: string };
export type Program = { id: number; subject: string; teaching_language: string; session_count: number; duration_minutes: number };
export type TeacherMatch = { teacher_staff_id: number; teacher_name: string; teacher_availability?: Slot[]; busy_slots?: (Slot & { code: string; date: string })[]; slots: Slot[] };
export type MatchResponse = { request: PrivateRequest; program: Program; first_date?: string; student_availability?: Slot[]; eligible_teachers?: TeacherMatch[]; matches: TeacherMatch[] };
export type Overview = { requests: PrivateRequest[]; subjects: { id: number; name: string }[] };
