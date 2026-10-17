import { ConsultantArticleScreen } from "@/components/consultant/consultant-article";
import { requireUser } from "@/lib/auth/session";
export default async function Page({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  await requireUser(`/consultant/articles/${articleId}`);
  return <ConsultantArticleScreen articleId={articleId} />;
}
