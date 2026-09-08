import type { Metadata } from "next";
import { NewArticleForm } from "@/components/articles/new-article/new-article-form";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "New article",
  description: "Set up a client article and choose how to collect expertise.",
};

export default async function NewArticlePage() {
  const user = await requireUser("/articles/new");
  return <NewArticleForm identity={toAuthIdentity(user)} />;
}
