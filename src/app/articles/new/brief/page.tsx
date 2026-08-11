import type { Metadata } from "next";
import { ArticleBrief } from "@/components/articles/article-brief/article-brief";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Article brief",
  description: "Shape the details Inkwell will use to build your outline.",
};

export default async function ArticleBriefPage() {
  const user = await requireUser("/articles/new/brief");
  return <ArticleBrief identity={toAuthIdentity(user)} />;
}
