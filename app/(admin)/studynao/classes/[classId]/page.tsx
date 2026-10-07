import { notFound } from "next/navigation";
import { ClassDetailContent } from "../components/ClassDetailContent";

export const metadata = { title: "Class Details | NAO Group Admin" };
export default async function Page({ params, searchParams }: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const [{ classId }, query] = await Promise.all([params, searchParams]);
  const id = Number(classId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const selected = Number(query.session);
  return <ClassDetailContent key={id} classId={id} sessionId={query.session === undefined ? null : Number.isSafeInteger(selected) && selected > 0 ? selected : -1} />;
}
