import type { Metadata } from "next";
import { ArticleReview } from "@/components/articles/article-review/article-review";

export const metadata: Metadata = {
  title: "Review article",
  description: "Review and resolve editorial suggestions before publishing.",
};

export default function ArticleReviewPage() {
  return <ArticleReview />;
}
