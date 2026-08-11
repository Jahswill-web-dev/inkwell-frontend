import type { Metadata } from "next";
import {
  NewArticleForm,
  type NewArticleMode,
} from "@/components/articles/new-article/new-article-form";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "New article",
  description: "Start an Inkwell article from an idea or your existing notes.",
};

type NewArticlePageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function NewArticlePage({
  searchParams,
}: NewArticlePageProps) {
  const params = await searchParams;
  const returnTo =
    params.mode === "notes" ? "/articles/new?mode=notes" : "/articles/new";
  const user = await requireUser(returnTo);
  const initialMode: NewArticleMode =
    params.mode === "notes" ? "notes" : "idea";

  return (
    <NewArticleForm identity={toAuthIdentity(user)} initialMode={initialMode} />
  );
}
