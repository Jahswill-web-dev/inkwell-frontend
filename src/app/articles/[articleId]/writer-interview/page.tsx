import type { Metadata } from "next";
import { WriterInterviewScreen } from "@/components/interview/writer-interview";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Writer interview",
  description: "Capture your perspective for the whole article.",
};

export default async function WriterInterviewPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const user = await requireUser(`/articles/${articleId}/writer-interview`);
  const identity = toAuthIdentity(user);

  return (
    <WriterInterviewScreen
      articleId={articleId}
      writerName={identity.username}
    />
  );
}
