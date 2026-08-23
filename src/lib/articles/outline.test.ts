import { describe, expect, it } from "vitest";
import { articleOutlinePatchSchema, articleOutlineSchema } from "./outline";

const sections = Array.from({ length: 3 }, (_, index) => ({
  id: `10000000-0000-4000-8000-00000000000${index}`,
  heading: `Section ${index + 1}`,
  purpose: "A useful purpose",
  key_points: ["A useful point"],
}));
const outline = {
  id: "a8d789b6-6e71-436e-a981-51d25e66f538",
  article_id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  sections,
  model_id: "gemini-2.5-flash",
  prompt_version: "article_outline_v1",
  input_token_count: 10,
  output_token_count: 20,
  generation_duration_ms: 100,
  is_stale: false,
  created_at: "2026-08-18T12:00:00Z",
  updated_at: "2026-08-18T12:00:00Z",
};

describe("article outline contracts", () => {
  it("validates persisted outlines and complete section patches", () => {
    expect(articleOutlineSchema.parse(outline).sections).toHaveLength(3);
    expect(articleOutlinePatchSchema.parse({ sections }).sections).toEqual(
      sections,
    );
  });

  it("enforces section and key-point limits", () => {
    expect(
      articleOutlinePatchSchema.safeParse({ sections: sections.slice(0, 2) })
        .success,
    ).toBe(false);
    expect(
      articleOutlinePatchSchema.safeParse({
        sections: [...sections, ...sections, ...sections, ...sections],
      }).success,
    ).toBe(false);
    expect(
      articleOutlinePatchSchema.safeParse({
        sections: [
          { ...sections[0], key_points: [] },
          sections[1],
          sections[2],
        ],
      }).success,
    ).toBe(false);
  });
});
