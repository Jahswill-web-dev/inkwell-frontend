import type { Metadata } from "next";
import { ArticleWorkspace } from "@/components/articles/article-workspace/article-workspace";
import { toAuthIdentity } from "@/lib/auth/identity";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Client interview",
  description: "Create and manage a client's article interview link.",
};

export default async function ArticleInterviewsPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const user = await requireUser("/articles/" + articleId + "/interviews");
  return (
    <ArticleWorkspace
      activeTab="interviews"
      articleId={articleId}
      identity={toAuthIdentity(user)}
    />
  );
}
