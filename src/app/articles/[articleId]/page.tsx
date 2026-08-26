import type { Metadata } from "next";
import { ArticleEditScreen } from "@/components/articles/new-article/article-edit-screen";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Edit article",
  description: "Update or delete an article intake.",
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const user = await requireUser(`/articles/${articleId}`);
  return <ArticleEditScreen articleId={articleId} identity={toAuthIdentity(user)} />;
}
