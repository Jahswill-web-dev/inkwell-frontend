import type { Metadata } from "next";
import { OutlineBuilder } from "@/components/articles/outline-builder/outline-builder";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Outline builder",
  description: "Shape and organize your article before drafting.",
};

export default async function OutlineBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ articleId?: string }>;
}) {
  const { articleId } = await searchParams;
  const next = articleId
    ? `/articles/new/outline?articleId=${encodeURIComponent(articleId)}`
    : "/articles/new/outline";
  const user = await requireUser(next);
  return (
    <OutlineBuilder articleId={articleId} identity={toAuthIdentity(user)} />
  );
}
