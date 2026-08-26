import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionContentBlocks } from "./section-content-blocks";

describe("SectionContentBlocks", () => {
  it("renders every structured block with semantic article markup", () => {
    render(
      <SectionContentBlocks
        blocks={[
          { type: "paragraph", text: "A clear opening." },
          { type: "subheading", text: "Practical steps" },
          { type: "bulleted_list", items: ["First point", "Second point"] },
          { type: "numbered_list", items: ["First step", "Second step"] },
        ]}
      />,
    );

    expect(screen.getByText("A clear opening.").tagName).toBe("P");
    expect(
      screen.getByRole("heading", { name: "Practical steps", level: 3 }),
    ).toBeVisible();
    const lists = screen.getAllByRole("list");
    expect(lists[0].tagName).toBe("UL");
    expect(lists[1].tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("supports a different semantic subheading level", () => {
    render(
      <SectionContentBlocks
        blocks={[{ type: "subheading", text: "Interview heading" }]}
        subheadingAs="h4"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Interview heading", level: 4 }),
    ).toBeVisible();
  });
});
