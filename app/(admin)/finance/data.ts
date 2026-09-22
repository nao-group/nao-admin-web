import type { AutoExpenseRule, DokuFee, Expense, Income, Payroll, Staff } from "@/types/admin";

export const initialDokuFees: DokuFee[] = [
  { id: 1, method: "Kartu kredit/debit", percentage: 2.8, fixedAmount: 2000, note: "Pembayaran penuh; Amex memiliki tarif berbeda", updatedAt: "2026-09-22" },
  { id: 2, method: "QRIS", percentage: 0.7, fixedAmount: 0, note: "Merchant discount rate", updatedAt: "2026-09-22" },
  { id: 3, method: "Virtual Account BCA", percentage: 0, fixedAmount: 4500, note: "Per transaksi berhasil", updatedAt: "2026-09-22" },
  { id: 4, method: "Virtual Account lainnya", percentage: 0, fixedAmount: 4000, note: "BNI, Mandiri, Permata, BRI, dan bank lain", updatedAt: "2026-09-22" },
  { id: 5, method: "DOKU Wallet / DANA", percentage: 1.5, fixedAmount: 0, note: "Tarif e-wallet dasar", updatedAt: "2026-09-22" },
  { id: 6, method: "OVO", percentage: 3.18, fixedAmount: 0, note: "Gunakan tarif kontrak aktual bila berbeda", updatedAt: "2026-09-22" },
  { id: 7, method: "ShopeePay", percentage: 4, fixedAmount: 0, note: "Gunakan tarif kontrak aktual bila berbeda", updatedAt: "2026-09-22" },
  { id: 8, method: "LinkAja", percentage: 3.5, fixedAmount: 0, note: "Alternatif fixed fee Rp2.500", updatedAt: "2026-09-22" },
];

export const initialIncomes: Income[] = [
  { id: 1, reference: "DOKU-260922-1841", source: "ThinkNAO", invoiceUrl: "https://dashboard.doku.com/invoice/DOKU-260922-1841", date: "2026-09-22T08:41", payer: "Alya Putri", grossAmount: 1299000, paymentMethod: "Virtual Account BCA", feeAmount: 4500, netAmount: 1294500, paidAmount: 1294500, notes: "Paket HSK intensif", status: "Paid", syncedFromDoku: true },
  { id: 2, reference: "DOKU-260921-1022", source: "ThinkNAO", invoiceUrl: "https://dashboard.doku.com/invoice/DOKU-260921-1022", date: "2026-09-21T14:18", payer: "Rayhan Akbar", grossAmount: 499000, paymentMethod: "QRIS", feeAmount: 3493, netAmount: 495507, paidAmount: 495507, notes: "Tryout bundle", status: "Paid", syncedFromDoku: true },
  { id: 3, reference: "STU-2026-0918", source: "StudyNAO", invoiceUrl: "", date: "2026-09-18T10:00", payer: "SMA Cakrawala", grossAmount: 12500000, paymentMethod: "Transfer bank", feeAmount: 0, netAmount: 12500000, paidAmount: 12500000, notes: "Program Mandarin semester ganjil", status: "Paid", syncedFromDoku: false },
  { id: 4, reference: "GRANT-2026-04", source: "Hibah", invoiceUrl: "https://drive.google.com/", date: "2026-09-15T09:30", payer: "Yayasan Pelita Bangsa", grossAmount: 25000000, paymentMethod: "Transfer bank", feeAmount: 0, netAmount: 25000000, paidAmount: 0, notes: "Tahap kedua menunggu pencairan", status: "Unpaid", syncedFromDoku: false },
  { id: 5, reference: "DOKU-260912-0904", source: "ThinkNAO", invoiceUrl: "https://dashboard.doku.com/invoice/DOKU-260912-0904", date: "2026-09-12T16:04", payer: "Nadia Halim", grossAmount: 899000, paymentMethod: "Kartu kredit/debit", feeAmount: 27172, netAmount: 871828, paidAmount: 0, notes: "Otorisasi kartu gagal", status: "Failed", syncedFromDoku: true },
  { id: 6, reference: "STU-2026-0908", source: "StudyNAO", invoiceUrl: "", date: "2026-09-08T13:00", payer: "Kevin Santoso", grossAmount: 2750000, paymentMethod: "Transfer bank", feeAmount: 0, netAmount: 2750000, paidAmount: 2750000, notes: "Private class 10 sesi", status: "Paid", syncedFromDoku: false },
];

export const initialExpenses: Expense[] = [
  { id: 1, reference: "EXP-2026-0901", category: "Biaya admin bank", date: "2026-09-01", paidBy: "NAO Group", evidenceUrl: "", amount: 10000, status: "Done", notes: "Biaya admin rekening operasional September", recurring: true },
  { id: 2, reference: "EXP-2026-0904", category: "Maintenance", date: "2026-09-04", paidBy: "Andi Wijaya", evidenceUrl: "https://drive.google.com/", amount: 2499000, status: "Done", notes: "Zoom Business dan server", recurring: false },
  { id: 3, reference: "EXP-2026-0916", category: "Lainnya", date: "2026-09-16", paidBy: "Sinta Maharani", evidenceUrl: "", amount: 780000, status: "Pending", notes: "Reimbursement materi kelas dan transport", recurring: false },
  { id: 4, reference: "PAY-2026-09", category: "Gaji", date: "2026-09-25", paidBy: "NAO Group", evidenceUrl: "", amount: 23747500, status: "Pending", notes: "Payroll September 2026", recurring: false },
];

export const initialStaff: Staff[] = [
  { id: 1, fullName: "Mei Lin Hartanto", email: "meilin@nao.group", phone: "+62 812-3456-7801", role: "Guru", classes: ["Mathematics (Chinese)"], bankAccount: "1234567890", bankAccountName: "MEI LIN HARTANTO", bank: "BCA", birthDate: "1994-03-18", joinDate: "2022-07-01", photoUrl: "", status: "Active", maritalStatus: "Menikah", province: "Jawa Timur", hskLevel: "HSK 6", baseSalary: 6500000, allowance: 750000 },
  { id: 2, fullName: "Rafi Pranata", email: "rafi@nao.group", phone: "+62 811-2233-4012", role: "Guru", classes: ["Mathematics (English)"], bankAccount: "0098123456", bankAccountName: "RAFI PRANATA", bank: "BNI", birthDate: "1997-08-09", joinDate: "2024-01-15", photoUrl: "", status: "Active", maritalStatus: "Belum menikah", province: "Jawa Barat", hskLevel: "—", baseSalary: 5750000, allowance: 500000 },
  { id: 3, fullName: "Sinta Maharani", email: "sinta@nao.group", phone: "+62 813-9087-1122", role: "Karyawan", classes: [], bankAccount: "8810202930", bankAccountName: "SINTA MAHARANI", bank: "BCA", birthDate: "1996-11-21", joinDate: "2023-03-01", photoUrl: "", status: "Active", maritalStatus: "Belum menikah", province: "DKI Jakarta", hskLevel: "—", baseSalary: 5800000, allowance: 650000 },
  { id: 4, fullName: "Andi Wijaya", email: "andi@nao.group", phone: "+62 812-8800-7611", role: "C-Level", classes: [], bankAccount: "1420087711", bankAccountName: "ANDI WIJAYA", bank: "Mandiri", birthDate: "1990-05-03", joinDate: "2021-09-01", photoUrl: "", status: "Active", maritalStatus: "Menikah", province: "DKI Jakarta", hskLevel: "—", baseSalary: 0, allowance: 0 },
  { id: 5, fullName: "Dian Permata", email: "dian@nao.group", phone: "+62 878-1122-3399", role: "Guru", classes: ["STEM Chinese"], bankAccount: "3210098876", bankAccountName: "DIAN PERMATA", bank: "BRI", birthDate: "1998-01-14", joinDate: "2025-02-10", photoUrl: "", status: "Inactive", maritalStatus: "Belum menikah", province: "Jawa Timur", hskLevel: "HSK 5", baseSalary: 4800000, allowance: 350000 },
];

export const initialPayrolls: Payroll[] = [
  { id: 1, staffId: 1, period: "2026-09", baseSalary: 6500000, allowance: 750000, reimbursement: 320000, adminFee: 0, totalTransfer: 7570000, status: "Done", sentAt: "2026-09-01T09:14" },
  { id: 2, staffId: 2, period: "2026-09", baseSalary: 5750000, allowance: 500000, reimbursement: 125000, adminFee: 2500, totalTransfer: 6372500, status: "Pending", sentAt: "" },
  { id: 3, staffId: 3, period: "2026-09", baseSalary: 5800000, allowance: 650000, reimbursement: 780000, adminFee: 0, totalTransfer: 7230000, status: "Pending", sentAt: "" },
];

export const initialAutoExpenseRules: AutoExpenseRule[] = [
  { id: 1, name: "Admin rekening operasional", category: "Biaya admin bank", amount: 10000, frequency: "Bulanan", dayOfWeek: 1, dayOfMonth: 1, monthOfYear: 1, paidBy: "NAO Group", notes: "Dibuat otomatis setiap awal bulan", active: true },
  { id: 2, name: "Zoom Business", category: "Maintenance", amount: 349000, frequency: "Bulanan", dayOfWeek: 1, dayOfMonth: 3, monthOfYear: 1, paidBy: "NAO Group", notes: "Langganan meeting bulanan", active: false },
];

export const cashflowLabels = ["Apr", "Mei", "Jun", "Jul", "Agu", "Sep"];
export const revenueTrend = [31.2, 34.8, 37.1, 36.5, 41.9, 54.4];
export const expenseTrend = [20.6, 22.1, 21.8, 24.2, 23.6, 27.0];
