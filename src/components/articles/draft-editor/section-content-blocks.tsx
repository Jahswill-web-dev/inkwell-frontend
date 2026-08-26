import type { ElementType } from "react";
import type { SectionContentBlock } from "@/lib/articles/interview";

export function SectionContentBlocks({
  blocks,
  className,
  subheadingAs = "h3",
}: {
  blocks: readonly SectionContentBlock[];
  className?: string;
  subheadingAs?: "h2" | "h3" | "h4";
}) {
  const Subheading = subheadingAs as ElementType;

  return (
    <div className={className}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "paragraph")
          return <p key={blockIndex}>{block.text}</p>;
        if (block.type === "subheading")
          return <Subheading key={blockIndex}>{block.text}</Subheading>;
        const items = block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{item}</li>
        ));
        return block.type === "numbered_list" ? (
          <ol key={blockIndex}>{items}</ol>
        ) : (
          <ul key={blockIndex}>{items}</ul>
        );
      })}
    </div>
  );
}
