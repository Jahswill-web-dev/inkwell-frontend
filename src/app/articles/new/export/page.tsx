import type { Metadata } from "next";
import { ArticleExport } from "@/components/articles/article-export/article-export";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Export article",
  description: "Choose a format and export your finished article.",
};

export default async function ArticleExportPage() {
  const user = await requireUser("/articles/new/export");
  return <ArticleExport identity={toAuthIdentity(user)} />;
}
