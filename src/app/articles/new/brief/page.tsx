import type { Metadata } from "next";
import { ArticleBrief } from "@/components/articles/article-brief/article-brief";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Article brief",
  description: "Shape the details Inkwell will use to build your outline.",
};

export default async function ArticleBriefPage({
  searchParams,
}: {
  searchParams: Promise<{ articleId?: string }>;
}) {
  const { articleId } = await searchParams;
  const next = articleId
    ? `/articles/new/brief?articleId=${encodeURIComponent(articleId)}`
    : "/articles/new/brief";
  const user = await requireUser(next);
  return <ArticleBrief articleId={articleId} identity={toAuthIdentity(user)} />;
}
