import { OverlapsContent } from "../OverlapsContent";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const id = Number(requestId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return <OverlapsContent requestId={id} />;
}
