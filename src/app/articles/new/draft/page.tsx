import type { Metadata } from "next";
import { DraftEditor } from "@/components/articles/draft-editor/draft-editor";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Draft editor",
  description: "Write and refine your article with contextual guidance.",
};

export default async function DraftEditorPage() {
  const user = await requireUser("/articles/new/draft");
  return <DraftEditor identity={toAuthIdentity(user)} />;
}
