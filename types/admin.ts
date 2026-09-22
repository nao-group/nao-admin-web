export type Payment = {
  id: string;
  member: string;
  product: "ThinkNAO" | "StudyNAO";
  amount: number;
  status: "Paid" | "Pending" | "Failed" | "Refunded";
  date: string;
  method: string;
};

export type BannerStatus = "Active" | "Scheduled" | "Draft" | "Expired";

export type Banner = {
  id: number;
  name: string;
  imageUrl: string;
  fileName: string;
  redirectUrl: string;
  status: BannerStatus;
  startsAt: string;
  endsAt: string;
};

export type Referral = {
  id: number;
  code: string;
  owner: string;
  discount: number;
  uses: number;
  limit: number;
  status: "Active" | "Paused" | "Expired";
  expiresAt: string;
};

export type EmailCampaign = {
  id: number;
  subject: string;
  recipient: string;
  audience: "Individual" | "Blast";
  status: "Sent" | "Scheduled" | "Draft";
  sentAt: string;
  openRate: number | null;
};

export type IncomeSource = "Hibah" | "StudyNAO" | "ThinkNAO" | "Lainnya";
export type IncomeStatus = "Paid" | "Unpaid" | "Failed";

export type Income = {
  id: number;
  reference: string;
  source: IncomeSource;
  customSource?: string;
  invoiceUrl: string;
  date: string;
  payer: string;
  grossAmount: number;
  paymentMethod: string;
  feeAmount: number;
  netAmount: number;
  paidAmount: number;
  notes: string;
  status: IncomeStatus;
  syncedFromDoku: boolean;
};

export type ExpenseCategory = "Gaji" | "Biaya admin bank" | "Maintenance" | "Lainnya";
export type ExpenseStatus = "Pending" | "Done";

export type Expense = {
  id: number;
  reference: string;
  category: ExpenseCategory;
  customCategory?: string;
  date: string;
  paidBy: string;
  evidenceUrl: string;
  amount: number;
  status: ExpenseStatus;
  notes: string;
  employeeId?: number;
  recurring?: boolean;
};

export type StaffRole = "Guru" | "Karyawan" | "C-Level";
export type StaffStatus = "Active" | "Inactive";

export type Staff = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  classes: string[];
  subjects: string[];
  bankAccount: string;
  bankAccountName: string;
  bank: string;
  birthDate: string;
  photoUrl: string;
  status: StaffStatus;
  maritalStatus: "Belum menikah" | "Menikah";
  city: string;
  hskLevel: string;
  baseSalary: number;
  allowance: number;
};

export type DokuFee = {
  id: number;
  method: string;
  percentage: number;
  fixedAmount: number;
  note: string;
  updatedAt: string;
};

export type PayrollStatus = "Pending" | "Done";

export type Payroll = {
  id: number;
  staffId: number;
  period: string;
  baseSalary: number;
  allowance: number;
  reimbursement: number;
  adminFee: number;
  totalTransfer: number;
  status: PayrollStatus;
  sentAt: string;
};

export type AutoExpenseRule = {
  id: number;
  name: string;
  category: ExpenseCategory;
  amount: number;
  dayOfMonth: number;
  paidBy: string;
  notes: string;
  active: boolean;
};
