import type { Staff } from "@/types/admin";

type RawStaff = Record<string, unknown>;

async function result<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { detail?: string }).detail ?? "Permintaan gagal diproses.");
  return body as T;
}

const roleFromApi: Record<string, Staff["role"]> = { teacher: "Guru", employee: "Karyawan", executive: "C-Level" };
const roleToApi: Record<Staff["role"], string> = { Guru: "teacher", Karyawan: "employee", "C-Level": "executive" };
const statusFromApi: Record<string, Staff["status"]> = { active: "Active", inactive: "Inactive" };
const statusToApi: Record<Staff["status"], string> = { Active: "active", Inactive: "inactive" };

function mapStaff(raw: RawStaff): Staff {
  const hsk = typeof raw.hsk_level === "number" ? `HSK ${raw.hsk_level}` : "—";
  return {
    id: Number(raw.id), fullName: String(raw.full_name ?? ""), email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""), role: roleFromApi[String(raw.role)] ?? "Karyawan",
    classes: Array.isArray(raw.class_names) ? raw.class_names.map(String) : [],
    bankAccount: String(raw.bank_account_number ?? ""), bankAccountName: String(raw.bank_account_name ?? ""),
    bank: String(raw.bank_name ?? ""), birthDate: String(raw.birth_date ?? ""), joinDate: String(raw.join_date ?? ""),
    photoUrl: typeof raw.photo_url === "string" ? raw.photo_url : "", status: statusFromApi[String(raw.status)] ?? "Inactive",
    maritalStatus: raw.marital_status === "married" ? "Menikah" : "Belum menikah", province: String(raw.province ?? ""),
    hskLevel: hsk, baseSalary: Number(raw.base_salary ?? 0), allowance: Number(raw.allowance ?? 0),
  };
}

function payload(staff: Staff) {
  const level = /^HSK ([1-6])$/.exec(staff.hskLevel);
  return {
    full_name: staff.fullName, email: staff.email, phone: staff.phone, role: roleToApi[staff.role],
    class_names: staff.role === "Guru" ? staff.classes : [], bank_account_number: staff.bankAccount,
    bank_account_name: staff.bankAccountName, bank_name: staff.bank, birth_date: staff.birthDate,
    join_date: staff.joinDate, status: statusToApi[staff.status],
    marital_status: staff.maritalStatus === "Menikah" ? "married" : "single", province: staff.province,
    hsk_level: staff.role === "Guru" && level ? Number(level[1]) : null,
    base_salary: staff.baseSalary, allowance: staff.allowance,
  };
}

export async function listStaff(): Promise<Staff[]> {
  const page = await result<{ items: RawStaff[] }>(await fetch("/api/admin/staff?page_size=100", { cache: "no-store" }));
  return page.items.map(mapStaff);
}

export async function getStaffOptions(): Promise<string[]> {
  const options = await result<{ classes: { name: string }[] }>(await fetch("/api/admin/staff/options", { cache: "no-store" }));
  return options.classes.map((item) => item.name);
}

export async function getProvinces(): Promise<string[]> {
  const response = await result<unknown>(await fetch("/api/provinces", { cache: "no-store" }));
  const rows = Array.isArray(response) ? response : response && typeof response === "object" && Array.isArray((response as { data?: unknown[] }).data) ? (response as { data: unknown[] }).data : [];
  return rows.map((item) => typeof item === "string" ? item : item && typeof item === "object" ? String((item as { name?: unknown }).name ?? "") : "").filter(Boolean);
}

export async function saveStaff(staff: Staff, photo?: File | null): Promise<Staff> {
  let saved = mapStaff(await result<RawStaff>(await fetch(staff.id ? `/api/admin/staff/${staff.id}` : "/api/admin/staff", {
    method: staff.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(staff)),
  })));
  if (photo) {
    const form = new FormData(); form.set("file", photo);
    saved = mapStaff(await result<RawStaff>(await fetch(`/api/admin/staff/${saved.id}/photo`, { method: "POST", body: form })));
  }
  return saved;
}

export async function deactivateStaff(id: number): Promise<Staff> {
  return mapStaff(await result<RawStaff>(await fetch(`/api/admin/staff/${id}/deactivate`, { method: "PATCH" })));
}
