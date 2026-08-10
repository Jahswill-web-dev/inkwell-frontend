import type { Metadata } from "next";
import { ArticleExport } from "@/components/articles/article-export/article-export";

export const metadata: Metadata = {
  title: "Export article",
  description: "Choose a format and export your finished article.",
};

export default function ArticleExportPage() {
  return <ArticleExport />;
}
