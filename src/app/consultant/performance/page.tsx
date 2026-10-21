import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { GenerationPerformance } from "@/components/consultant/generation-performance";

export default async function Page() {
  const user = await requireUser("/consultant/performance");
  const owner = process.env.GENERATION_PERFORMANCE_OWNER_EMAIL?.trim().toLowerCase();
  if (!owner || user.email.toLowerCase() !== owner) notFound();
  return <GenerationPerformance />;
}
