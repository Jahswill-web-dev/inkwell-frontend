import type { Metadata } from "next";
import { ArticleReview } from "@/components/articles/article-review/article-review";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Review article",
  description: "Review and resolve editorial suggestions before publishing.",
};

export default async function ArticleReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ articleId?: string }>;
}) {
  const { articleId } = await searchParams;
  const next = articleId
    ? `/articles/new/review?articleId=${encodeURIComponent(articleId)}`
    : "/articles/new/review";
  const user = await requireUser(next);
  return (
    <ArticleReview articleId={articleId} identity={toAuthIdentity(user)} />
  );
}
