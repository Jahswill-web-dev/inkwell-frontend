import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteArticleOutline,
  generateArticleBrief,
  generateArticleOutline,
  getArticleBrief,
  getArticleOutline,
  updateArticleBrief,
  updateArticleOutline,
} from "./client";

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
const brief = {
  id: "ccbfce42-98bf-4f44-b4cf-206cc3661f11",
  article_id: articleId,
  summary: "Summary",
  core_angle: "Angle",
  audience_insights: [],
  tone_and_style: "Practical",
  key_takeaways: [],
  evidence_gaps: [],
  call_to_action: "Act",
  seo: {
    suggested_titles: [],
    primary_keyword: "keyword",
    secondary_keywords: [],
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
const sections = Array.from({ length: 3 }, (_, index) => ({
  heading: `Section ${index + 1}`,
  purpose: "Purpose",
  key_points: ["Point"],
}));
const outline = {
  id: "a8d789b6-6e71-436e-a981-51d25e66f538",
  article_id: articleId,
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

afterEach(() => vi.unstubAllGlobals());

describe("article brief client", () => {
  it("gets and generates through the frontend proxy", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(brief),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getArticleBrief(articleId)).resolves.toMatchObject({
      id: brief.id,
    });
    await expect(generateArticleBrief(articleId)).resolves.toMatchObject({
      id: brief.id,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/api/articles/${articleId}/brief`,
      { headers: {} },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/articles/${articleId}/brief`,
      { method: "POST", headers: {} },
    );
  });

  it("updates briefs and supports complete outline CRUD", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(brief),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(outline),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(outline),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(outline),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined),
      });
    vi.stubGlobal("fetch", fetchMock);

    await updateArticleBrief(articleId, { summary: "Updated" });
    await getArticleOutline(articleId);
    await generateArticleOutline(articleId);
    await updateArticleOutline(articleId, { sections });
    await deleteArticleOutline(articleId);

    expect(
      fetchMock.mock.calls.map(([url, init]) => [url, init.method ?? "GET"]),
    ).toEqual([
      [`/api/articles/${articleId}/brief`, "PATCH"],
      [`/api/articles/${articleId}/outline`, "GET"],
      [`/api/articles/${articleId}/outline`, "POST"],
      [`/api/articles/${articleId}/outline`, "PATCH"],
      [`/api/articles/${articleId}/outline`, "DELETE"],
    ]);
  });
});
