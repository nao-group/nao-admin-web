import type { Payment } from "@/types/admin";

export const payments: Payment[] = [
  { id: "INV-2026-0908", member: "Alya Putri", product: "ThinkNAO", amount: 1299000, status: "Paid", date: "2026-09-08", method: "BCA Virtual Account" },
  { id: "INV-2026-0907", member: "Rayhan Akbar", product: "StudyNAO", amount: 499000, status: "Paid", date: "2026-09-07", method: "GoPay" },
  { id: "INV-2026-0906", member: "Dimas Pratama", product: "ThinkNAO", amount: 149000, status: "Pending", date: "2026-09-06", method: "Bank Transfer" },
  { id: "INV-2026-0905", member: "Nadia Halim", product: "StudyNAO", amount: 249000, status: "Failed", date: "2026-09-05", method: "Credit Card" },
  { id: "INV-2026-0904", member: "Kevin Santoso", product: "StudyNAO", amount: 499000, status: "Paid", date: "2026-09-04", method: "QRIS" },
  { id: "INV-2026-0903", member: "Maya Lestari", product: "ThinkNAO", amount: 149000, status: "Refunded", date: "2026-09-03", method: "GoPay" },
];

export const revenueGrowth = [18.4, 21.6, 19.8, 25.2, 28.9, 31.4, 35.8, 39.2, 43.7];
export const revenueLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep"];
