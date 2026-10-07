export type StudentDraft = {
  full_name: string; email: string; whatsapp: string; grade: string;
  parent_email: string; province: string; current_school: string;
  dream_university: string; target_major: string;
};
export type StudentField = keyof StudentDraft;
export type ParsedStudent = { values: Partial<StudentDraft>; warnings: string[] };
