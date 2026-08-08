import type { Metadata } from "next";
import { OutlineBuilder } from "@/components/articles/outline-builder/outline-builder";

export const metadata: Metadata = {
  title: "Outline builder",
  description: "Shape and organize your article before drafting.",
};

export default function OutlineBuilderPage() {
  return <OutlineBuilder />;
}
