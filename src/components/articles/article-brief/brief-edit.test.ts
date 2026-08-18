import { describe, expect, it } from "vitest";
import type { ArticleBrief } from "@/lib/articles/brief";
import { changedBriefFields, createBriefEditState } from "./brief-edit";

const brief: ArticleBrief = {
  id: "ccbfce42-98bf-4f44-b4cf-206cc3661f11",
  article_id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  summary: "Summary",
  core_angle: "Angle",
  audience_insights: ["Insight"],
  tone_and_style: "Practical",
  key_takeaways: ["Takeaway"],
  evidence_gaps: [],
  call_to_action: "Act",
  seo: {
    suggested_titles: ["Title"],
    primary_keyword: "keyword",
    secondary_keywords: ["secondary"],
    meta_description: "Description",
  },
  model_id: "gemini-2.5-flash",
  prompt_version: "article_brief_v1",
  input_token_count: 10,
  output_token_count: 20,
  generation_duration_ms: 100,
  is_stale: false,
  created_at: "2026-08-14T12:00:00Z",
  updated_at: "2026-08-14T12:00:00Z",
};

describe("brief editing", () => {
  it("returns no patch for an unchanged draft", () => {
    expect(changedBriefFields(brief, createBriefEditState(brief))).toBeNull();
  });

  it("normalizes lines and includes only changed nested fields", () => {
    const draft = createBriefEditState(brief);
    draft.keyTakeaways = "First\n\nSecond ";
    draft.metaDescription = " Updated description ";
    expect(changedBriefFields(brief, draft)).toEqual({
      key_takeaways: ["First", "Second"],
      seo: { meta_description: "Updated description" },
    });
  });
});
