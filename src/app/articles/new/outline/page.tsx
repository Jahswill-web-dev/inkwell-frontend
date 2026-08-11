import type { Metadata } from "next";
import { OutlineBuilder } from "@/components/articles/outline-builder/outline-builder";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Outline builder",
  description: "Shape and organize your article before drafting.",
};

export default async function OutlineBuilderPage() {
  const user = await requireUser("/articles/new/outline");
  return <OutlineBuilder identity={toAuthIdentity(user)} />;
}
