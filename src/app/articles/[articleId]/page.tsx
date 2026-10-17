import { redirect } from "next/navigation";
import { articleBackendClient, getArticleToken } from "@/lib/articles/server";
import type { Metadata } from "next";
import { ArticleWorkspace } from "@/components/articles/article-workspace/article-workspace";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Article workspace",
  description:
    "Manage article interviews, source material, and writing progress.",
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const user = await requireUser(`/articles/${articleId}`);
  const token = await getArticleToken();
  if (token) {
    const response = await articleBackendClient(token).get(
      `/api/v1/articles/${encodeURIComponent(articleId)}`,
    );
    if (response.data.experience === "consultant")
      redirect(`/consultant/articles/${articleId}`);
  }
  return (
    <ArticleWorkspace articleId={articleId} identity={toAuthIdentity(user)} />
  );
}
