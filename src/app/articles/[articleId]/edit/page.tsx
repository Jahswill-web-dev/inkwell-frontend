import type { Metadata } from "next";
import { ArticleEditScreen } from "@/components/articles/new-article/article-edit-screen";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Edit article setup",
  description: "Update or delete an article intake.",
};

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const user = await requireUser(`/articles/${articleId}/edit`);
  return (
    <ArticleEditScreen articleId={articleId} identity={toAuthIdentity(user)} />
  );
}
