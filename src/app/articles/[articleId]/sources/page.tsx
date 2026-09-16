import type { Metadata } from "next";
import { ArticleWorkspace } from "@/components/articles/article-workspace/article-workspace";
import { toAuthIdentity } from "@/lib/auth/identity";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Source review",
  description: "Review and approve interview material before generation.",
};

export default async function ArticleSourcesPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const user = await requireUser(`/articles/${articleId}/sources`);
  return (
    <ArticleWorkspace
      activeTab="sources"
      articleId={articleId}
      identity={toAuthIdentity(user)}
    />
  );
}
