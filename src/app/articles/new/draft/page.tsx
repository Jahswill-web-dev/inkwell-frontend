import type { Metadata } from "next";
import { DraftEditor } from "@/components/articles/draft-editor/draft-editor";

export const metadata: Metadata = {
  title: "Draft editor",
  description: "Write and refine your article with contextual guidance.",
};

export default function DraftEditorPage() {
  return <DraftEditor />;
}
