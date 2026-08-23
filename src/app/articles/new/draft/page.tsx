import type { Metadata } from "next";
import { DraftEditor } from "@/components/articles/draft-editor/draft-editor";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Draft editor",
  description: "Write and refine your article with contextual guidance.",
};

export default async function DraftEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ articleId?: string }>;
}) {
  const { articleId } = await searchParams;
  const next = articleId
    ? `/articles/new/draft?articleId=${encodeURIComponent(articleId)}`
    : "/articles/new/draft";
  const user = await requireUser(next);
  return <DraftEditor articleId={articleId} identity={toAuthIdentity(user)} />;
}
