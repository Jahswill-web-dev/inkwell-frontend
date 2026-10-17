import { ConsultantInterviewScreen } from "@/components/consultant/consultant-interview";
import { requireUser } from "@/lib/auth/session";
export default async function Page({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  await requireUser(`/consultant/interviews/${interviewId}`);
  return <ConsultantInterviewScreen interviewId={interviewId} />;
}
