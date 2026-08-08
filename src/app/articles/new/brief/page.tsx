import type { Metadata } from "next";
import { ArticleBrief } from "@/components/articles/article-brief/article-brief";

export const metadata: Metadata = {
  title: "Article brief",
  description: "Shape the details Inkwell will use to build your outline.",
};

export default function ArticleBriefPage() {
  return <ArticleBrief />;
}
