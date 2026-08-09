import { describe, expect, it } from "vitest";
import {
  countDraftWords,
  createDefaultDraft,
  parseDraft,
} from "./draft-editor-data";

describe("draft editor data", () => {
  it("creates a reference draft and derives metadata from a saved outline", () => {
    const draft = createDefaultDraft(
      JSON.stringify({
        workingTitle: "A Better Creative Practice",
        sections: [
          { id: "opening", title: "Opening" },
          { id: "lesson", title: "The lesson" },
        ],
      }),
    );

    expect(draft.title).toBe("A Better Creative Practice");
    expect(draft.sections.map((section) => section.title)).toEqual([
      "Opening",
      "The lesson",
    ]);
    expect(countDraftWords(draft)).toBeGreaterThan(0);
  });

  it("rejects malformed or unsupported saved drafts", () => {
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ schemaVersion: 2 }))).toBeNull();
    expect(
      parseDraft(
        JSON.stringify({ schemaVersion: 1, title: "Draft", sections: [{}] }),
      ),
    ).toBeNull();
  });

  it("round-trips a valid versioned draft", () => {
    const draft = createDefaultDraft();
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
  });
});
