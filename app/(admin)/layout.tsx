import { AdminShell } from "@/components/admin-shell";
import { ResizableTables } from "@/components/ui/resizable-tables";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <><ResizableTables /><AdminShell>{children}</AdminShell></>;
}
