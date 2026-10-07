import { GRADES } from "./data";
import type { ParsedStudent, StudentDraft, StudentField } from "./types";
const aliases: Record<string, StudentField> = {
  nama: "full_name", "nama lengkap": "full_name", name: "full_name", "full name": "full_name",
  email: "email", "email murid": "email", "student email": "email",
  whatsapp: "whatsapp", wa: "whatsapp", "nomor whatsapp": "whatsapp", phone: "whatsapp", "nomor hp": "whatsapp",
  grade: "grade", "jenjang studi": "grade", "study level": "grade", kelas: "grade",
  "email orang tua": "parent_email", "email orangtua": "parent_email", "parent email": "parent_email",
  provinsi: "province", province: "province",
  sekolah: "current_school", "sekolah saat ini": "current_school", "current school": "current_school",
  "universitas impian": "dream_university", "dream university": "dream_university",
  "jurusan tujuan": "target_major", "target major": "target_major",
};
export function localWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("62") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits;
}
export function parseStudentText(text: string): ParsedStudent {
  const result: ParsedStudent = { values: {}, warnings: [] };
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const match = line.trim().replace(/^[-*•]\s*/, "").match(/^([^:=]+)\s*[:=]\s*(.*)$/);
    if (!match) { result.warnings.push(`Baris ${index + 1}: gunakan format Label: nilai.`); return; }
    const key = aliases[match[1].trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ")];
    if (!key) { result.warnings.push(`Baris ${index + 1}: label “${match[1].trim()}” tidak dikenali.`); return; }
    let value = match[2].trim();
    if (!value || value === "—" || value === "-") return;
    if (key === "grade") {
      const number = value.match(/^(?:grade\s*|kelas\s*)?(7|8|9|10|11|12)$/i)?.[1];
      value = number ? `Grade ${number}` : /^(other|others|lainnya)$/i.test(value) ? "Others" : value;
      if (!GRADES.includes(value)) { result.warnings.push(`Baris ${index + 1}: grade tidak tersedia. Pilih grade melalui form.`); return; }
    }
    if (key === "whatsapp") value = localWhatsApp(value);
    if (key === "email" || key === "parent_email") value = value.toLowerCase();
    if (result.values[key] !== undefined) { result.warnings.push(`Baris ${index + 1}: label duplikat; nilai pertama digunakan.`); return; }
    result.values[key] = value;
  });
  return result;
}
export function validateStudent(draft: StudentDraft): Partial<Record<StudentField, string>> {
  const errors: Partial<Record<StudentField, string>> = {};
  if (draft.full_name.trim().length < 2) errors.full_name = "Isi nama lengkap, minimal 2 karakter.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = "Masukkan email yang valid.";
  if (!/^8\d{7,12}$/.test(draft.whatsapp)) errors.whatsapp = "Masukkan nomor Indonesia yang valid, mulai dari 8 setelah +62.";
  if (!GRADES.includes(draft.grade)) errors.grade = "Pilih grade.";
  if (draft.parent_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.parent_email.trim())) errors.parent_email = "Masukkan email orang tua yang valid.";
  return errors;
}
