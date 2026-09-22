import { redirect } from "next/navigation";

export default function LegacyPaymentsPage() {
  // Payment records are now consolidated into the richer Finance income flow.
  redirect("/finance/income");
}
