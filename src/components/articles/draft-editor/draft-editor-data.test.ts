import { describe, expect, it } from "vitest";
import {
  countDraftWords,
  createDefaultDraft,
  normalizeEditorState,
  toArticleDraftPatch,
  toDraftArticleState,
} from "./draft-editor-data";

describe("draft editor data", () => {
  it("normalizes an API empty root into a Lexical-compatible empty paragraph", () => {
    const backendEmptyState =
      '{"root":{"children":[],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';
    const normalized = JSON.parse(normalizeEditorState(backendEmptyState)) as {
      root: { children: unknown[] };
    };

    expect(normalized.root.children).toHaveLength(1);
    expect(normalized.root.children[0]).toMatchObject({
      type: "paragraph",
      version: 1,
    });
  });

  it("maps an API article and draft into editor state and back", () => {
    const fixture = createDefaultDraft();
    const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
    const article = {
      id: articleId,
      user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
      notes: "Notes",
      working_title: "A Better Creative Practice",
      target_audience: ["Writers"],
      article_goal: "inform_and_inspire" as const,
      created_at: "2026-08-12T12:00:00Z",
      updated_at: "2026-08-12T12:00:00Z",
    };
    const draft = {
      id: "30000000-0000-4000-8000-000000000000",
      article_id: articleId,
      sections: [
        {
          id: "20000000-0000-4000-8000-000000000000",
          outline_section_id: "10000000-0000-4000-8000-000000000000",
          title: "Opening",
          goal: "Purpose from the outline",
          checklist: fixture.sections[0].checklist,
          editor_state: fixture.sections[0].editorState,
        },
      ],
      created_at: "2026-08-18T12:00:00Z",
      updated_at: "2026-08-18T12:05:00Z",
    };

    const editorDraft = toDraftArticleState(article, draft);
    expect(editorDraft.title).toBe("A Better Creative Practice");
    expect(editorDraft.sections[0]).toMatchObject({
      outlineSectionId: "10000000-0000-4000-8000-000000000000",
      title: "Opening",
      goal: "Purpose from the outline",
    });
    expect(toArticleDraftPatch(editorDraft)).toEqual({
      sections: draft.sections.map(
        ({ id, outline_section_id, title, goal, checklist, editor_state }) => ({
          id,
          outline_section_id,
          title,
          goal,
          checklist,
          editor_state,
        }),
      ),
    });
    expect(countDraftWords(editorDraft)).toBeGreaterThan(0);
  });
});
