import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createRef } from "react";
import type { Revision, Section } from "@/lib/consultant/client";
import { ConsultantReview } from "./consultant-review";
import { diffBlocks } from "@/lib/consultant/revision-diff";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
afterEach(cleanup);
const paragraph = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", text }],
});
function section(id: string, title: string, children: object[]): Section {
  return {
    id,
    title,
    outline_section_id: null,
    goal: "",
    checklist: [],
    editor_state: JSON.stringify({ root: { children } }),
  };
}
function open(
  current: Section[],
  sections: Section[],
  extra: Partial<Parameters<typeof ConsultantReview>[0]> = {},
) {
  const revision: Revision = {
    id: "proposal",
    kind: "proposal",
    sections,
    request: "Make the opening clearer.",
    summary: "Clarified the opening.",
    gaps: [],
    findings: [],
    created_at: "2026-11-26T12:00:00Z",
  };
  const props = {
    title: "Better handoffs",
    current,
    revision,
    dirty: false,
    busy: false,
    error: "",
    onClose: vi.fn(),
    onApply: vi.fn(),
    onReject: vi.fn(),
    dialogRef: createRef<HTMLElement>(),
    backRef: createRef<HTMLButtonElement>(),
    ...extra,
  };
  render(<ConsultantReview {...props} />);
  return props;
}

it("shows readable removals and additions, then only the proposed content when changes are hidden", () => {
  const current = [
    section("opening", "Opening", [
      paragraph("Tools do not resolve a decision nobody owns."),
      paragraph("A handoff needs one owner."),
    ]),
  ];
  const suggested = [
    section("opening", "Opening", [
      paragraph("Clear ownership makes handoffs work."),
      paragraph("A handoff needs one accountable owner."),
    ]),
  ];
  open(current, suggested);
  const article = screen.getByRole("article");
  expect(article.querySelector("del")).toBeTruthy();
  expect(article).toHaveTextContent(
    "Tools do not resolve a decision nobody owns.",
  );
  expect(article).toHaveTextContent("Clear ownership makes handoffs work.");
  const toggle = screen.getByRole("switch", { name: "Show changes" });
  fireEvent.click(toggle);
  expect(article.querySelector("ins, del")).toBeNull();
  expect(article).not.toHaveTextContent(
    "Tools do not resolve a decision nobody owns.",
  );
  expect(article).toHaveTextContent("A handoff needs one accountable owner.");
  expect(current[0].editor_state).toContain("Tools do not resolve");
});

it("includes deleted sections and complete removals when a full rewrite gives sections new IDs", () => {
  open(
    [
      section("old-opening", "Opening", [paragraph("The old perspective.")]),
      section("old-example", "Example", [
        paragraph("An example that will be removed."),
      ]),
    ],
    [
      section("new-opening", "Opening", [
        paragraph("The rewritten perspective."),
      ]),
    ],
  );
  const article = screen.getByRole("article");
  expect(article).toHaveTextContent("An example that will be removed.");
  expect(article).toHaveTextContent("The old perspective.");
  expect(article).toHaveTextContent("The rewritten perspective.");
  fireEvent.click(screen.getByRole("switch", { name: "Show changes" }));
  expect(article).not.toHaveTextContent("An example that will be removed.");
  expect(article).not.toHaveTextContent("The old perspective.");
});

it("identifies section moves without presenting unchanged text as a rewrite", () => {
  const one = section("one", "Ownership", [
    paragraph("Give the next decision an owner."),
  ]);
  const two = section("two", "Clarity", [paragraph("Define what done means.")]);
  open([one, two], [two, one]);
  const article = screen.getByRole("article");
  expect(article).toHaveTextContent("Moved from section 2");
  expect(article).toHaveTextContent("Moved from section 1");
  expect(within(article).queryByText("Added section")).not.toBeInTheDocument();
  expect(article.querySelector("ins, del")).toBeNull();
});

it("retains rich text and source links in both views without rendering unsafe URLs", () => {
  const content = [
    {
      type: "paragraph",
      children: [
        { type: "text", text: "Evidence ", format: 1 },
        {
          type: "link",
          url: "https://example.org/study",
          children: [{ type: "text", text: "Case study" }],
        },
        {
          type: "link",
          url: "javascript:alert(1)",
          children: [{ type: "text", text: "Untrusted URL" }],
        },
      ],
    },
    {
      type: "list",
      listType: "bullet",
      children: [
        {
          type: "listitem",
          children: [{ type: "text", text: "A practical step." }],
        },
      ],
    },
  ];
  open([], [section("new", "Opening", content)]);
  for (let i = 0; i < 2; i++) {
    const article = screen.getByRole("article");
    expect(
      within(article).getByRole("link", { name: "Case study" }),
    ).toHaveAttribute("href", "https://example.org/study");
    expect(
      within(article).queryByRole("link", { name: "Untrusted URL" }),
    ).not.toBeInTheDocument();
    expect(within(article).getByRole("listitem")).toHaveTextContent(
      "A practical step.",
    );
    expect(article.querySelector("strong")).toHaveTextContent("Evidence");
    fireEvent.click(screen.getByRole("switch", { name: "Show changes" }));
  }
});

it("keeps approval explicit, blocks it for unsaved changes, and exposes close and reject actions", () => {
  const props = open([], [], { dirty: true });
  expect(
    screen.getByRole("button", { name: "Use this version" }),
  ).toBeDisabled();
  expect(
    screen.getByText("Save your current changes before applying this version."),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Back to article" }));
  expect(props.onClose).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Reject suggestion" }));
  expect(props.onReject).toHaveBeenCalledOnce();
  expect(props.onApply).not.toHaveBeenCalled();
});

it("keeps every paragraph in a long rewrite review", () => {
  const before = Array.from({ length: 250 }, (_, i) =>
    paragraph(`Original paragraph ${i}.`),
  );
  const after = Array.from({ length: 250 }, (_, i) =>
    paragraph(`Rewritten paragraph ${i}.`),
  );
  const changes = diffBlocks(before, after);
  expect(changes.filter((change) => change.before)).toHaveLength(250);
  expect(changes.filter((change) => change.after)).toHaveLength(250);
  expect(changes.at(-1)?.after?.children?.[0].text).toBe(
    "Rewritten paragraph 249.",
  );
});
