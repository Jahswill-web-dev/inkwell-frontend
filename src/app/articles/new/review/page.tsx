import type { Metadata } from "next";
import { ArticleReview } from "@/components/articles/article-review/article-review";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Review article",
  description: "Review and resolve editorial suggestions before publishing.",
};

export default async function ArticleReviewPage() {
  const user = await requireUser("/articles/new/review");
  return <ArticleReview identity={toAuthIdentity(user)} />;
}
