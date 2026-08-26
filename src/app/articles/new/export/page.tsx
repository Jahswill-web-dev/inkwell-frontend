import type { Metadata } from "next";
import { ArticleExport } from "@/components/articles/article-export/article-export";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Export article",
  description: "Choose a format and export your finished article.",
};

export default async function ArticleExportPage({
  searchParams,
}: {
  searchParams: Promise<{ articleId?: string }>;
}) {
  const { articleId } = await searchParams;
  const next = articleId
    ? `/articles/new/export?articleId=${encodeURIComponent(articleId)}`
    : "/articles/new/export";
  const user = await requireUser(next);
  return (
    <ArticleExport articleId={articleId} identity={toAuthIdentity(user)} />
  );
}
