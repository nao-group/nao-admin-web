import type { StudentDraft, StudentField } from "./types";
export const GRADES = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Others"];
export const FIELD_LABELS: Record<StudentField, string> = {
  full_name: "Nama lengkap", email: "Email", whatsapp: "WhatsApp", grade: "Grade",
  parent_email: "Email orang tua", province: "Provinsi", current_school: "Sekolah saat ini",
  dream_university: "Universitas impian", target_major: "Jurusan tujuan",
};
export const blankStudent = (): StudentDraft => ({
  full_name: "", email: "", whatsapp: "", grade: "Grade 12", parent_email: "", province: "",
  current_school: "", dream_university: "", target_major: "",
});
export const SAMPLE_TEXT = `Nama lengkap: Amanda Putri
Email: amanda@example.com
WhatsApp: 081234567890
Grade: Grade 12
Email orang tua: parent@example.com
Provinsi: Banten
Sekolah saat ini: SMA Contoh
Universitas impian: Tsinghua University
Jurusan tujuan: Computer Science`;
