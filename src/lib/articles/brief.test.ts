import { describe, expect, it } from "vitest";
import { articleBriefPatchSchema, articleBriefSchema } from "./brief";

const validBrief = {
  id: "ccbfce42-98bf-4f44-b4cf-206cc3661f11",
  article_id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  summary: "Summary",
  core_angle: "Core angle",
  audience_insights: ["Insight"],
  tone_and_style: "Practical",
  key_takeaways: ["Takeaway"],
  evidence_gaps: [],
  call_to_action: "Act now",
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

describe("article brief contracts", () => {
  it("accepts the updated response without an embedded outline", () => {
    expect(articleBriefSchema.parse(validBrief)).toMatchObject({
      summary: "Summary",
    });
  });

  it("accepts nested partial SEO patches", () => {
    expect(
      articleBriefPatchSchema.parse({ seo: { meta_description: "Updated" } }),
    ).toEqual({ seo: { meta_description: "Updated" } });
  });

  it("rejects empty top-level and nested patches", () => {
    expect(articleBriefPatchSchema.safeParse({}).success).toBe(false);
    expect(articleBriefPatchSchema.safeParse({ seo: {} }).success).toBe(false);
  });
});
