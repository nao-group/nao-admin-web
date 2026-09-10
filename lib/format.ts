export const formatCurrency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export const formatDate = (value: string) => value === "—" ? value : new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export function statusColor(status: string) {
  if (["Active", "Paid", "Sent"].includes(status)) return "teal";
  if (["Trial", "Pending", "Scheduled"].includes(status)) return "yellow";
  if (["Failed", "Expired"].includes(status)) return "red";
  if (status === "Refunded") return "violet";
  return "gray";
}
