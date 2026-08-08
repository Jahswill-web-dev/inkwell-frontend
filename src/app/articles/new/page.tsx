import type { Metadata } from "next";
import {
  NewArticleForm,
  type NewArticleMode,
} from "@/components/articles/new-article/new-article-form";

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
  const initialMode: NewArticleMode =
    params.mode === "notes" ? "notes" : "idea";

  return <NewArticleForm initialMode={initialMode} />;
}
