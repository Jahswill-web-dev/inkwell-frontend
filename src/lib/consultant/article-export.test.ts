import { expect, it } from "vitest";
import type { Section } from "./client";
import { serializeConsultantArticle } from "./article-export";

function section(title: string, children: unknown[]): Section {
  return {
    id: title,
    outline_section_id: null,
    title,
    goal: "",
    checklist: [],
    editor_state: JSON.stringify({
      root: { type: "root", version: 1, children },
    }),
  };
}

it("renders one article as Markdown, rich HTML, and clean plain text", () => {
  const exported = serializeConsultantArticle("A & B", [
    section("Introduction", [
      {
        type: "anchored-paragraph",
        children: [
          { type: "text", text: "Start ", format: 0 },
          { type: "text", text: "strong", format: 1 },
          { type: "text", text: " and ", format: 0 },
          { type: "text", text: "clear", format: 2 },
          { type: "text", text: ". Read ", format: 0 },
          {
            type: "link",
            url: "https://example.org/study",
            children: [{ type: "text", text: "Case study", format: 0 }],
          },
          { type: "text", text: ".", format: 0 },
        ],
      },
      { type: "quote", children: [{ type: "text", text: "A useful thought" }] },
      {
        type: "list",
        listType: "bullet",
        children: [
          {
            type: "listitem",
            children: [{ type: "text", text: "First step" }],
          },
          {
            type: "listitem",
            children: [{ type: "text", text: "Second step" }],
          },
        ],
      },
    ]),
    section("Next steps", [
      {
        type: "heading",
        tag: "h3",
        children: [{ type: "text", text: "A smaller heading" }],
      },
      { type: "paragraph", children: [{ type: "text", text: "Keep going." }] },
    ]),
  ]);

  expect(exported.markdown).toContain("# A & B\n\n## Introduction");
  expect(exported.markdown).toContain("**strong** and *clear*");
  expect(exported.markdown).toContain(
    "[Case study](https://example.org/study)",
  );
  expect(exported.markdown).toContain("> A useful thought");
  expect(exported.markdown).toContain("- First step\n- Second step");
  expect(exported.markdown).toContain("### A smaller heading");
  expect(exported.html).toContain("<h1>A &amp; B</h1><h2>Introduction</h2>");
  expect(exported.html).toContain("<strong>strong</strong> and <em>clear</em>");
  expect(exported.html).toContain(
    '<a href="https://example.org/study" rel="noopener noreferrer">Case study</a>',
  );
  expect(exported.html).toContain(
    "<blockquote><p>A useful thought</p></blockquote>",
  );
  expect(exported.html).toContain(
    "<ul><li>First step</li><li>Second step</li></ul>",
  );
  expect(exported.plain).toContain(
    "A & B\n\nIntroduction\n\nStart strong and clear.",
  );
  expect(exported.plain).toContain("Case study (https://example.org/study)");
  expect(exported.plain).toContain("• First step\n• Second step");
  expect(exported.plain).not.toContain("## ");
});

it("escapes article text and omits unsafe links from HTML", () => {
  const exported = serializeConsultantArticle("A <script>", [
    section("Use *care*", [
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Do [this] ", format: 0 },
          {
            type: "link",
            url: "javascript:alert(1)",
            children: [{ type: "text", text: "unsafe link", format: 0 }],
          },
        ],
      },
    ]),
  ]);

  expect(exported.html).toContain("<h1>A &lt;script&gt;</h1>");
  expect(exported.html).not.toContain("javascript:");
  expect(exported.markdown).toContain("## Use \\*care\\*");
  expect(exported.markdown).toContain("Do \\[this\\] unsafe link");
});
