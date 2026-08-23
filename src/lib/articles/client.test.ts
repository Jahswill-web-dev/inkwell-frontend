import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createArticleDraft,
  deleteArticleOutline,
  generateArticleBrief,
  generateArticleOutline,
  generateTalkingPoints,
  getArticleDraft,
  getArticleBrief,
  getArticleOutline,
  updateArticleBrief,
  updateArticleDraft,
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
  id: `10000000-0000-4000-8000-00000000000${index}`,
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
const draftSection = {
  id: "20000000-0000-4000-8000-000000000000",
  outline_section_id: sections[0].id,
  title: sections[0].heading,
  goal: sections[0].purpose,
  checklist: [],
  editor_state: '{"root":{"children":[]}}',
};
const draft = {
  id: "30000000-0000-4000-8000-000000000000",
  article_id: articleId,
  sections: [draftSection],
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

  it("supports complete draft API persistence", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(draft),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getArticleDraft(articleId);
    await createArticleDraft(articleId);
    await updateArticleDraft(articleId, { sections: [draftSection] });

    expect(
      fetchMock.mock.calls.map(([url, init]) => [url, init?.method ?? "GET"]),
    ).toEqual([
      [`/api/articles/${articleId}/draft`, "GET"],
      [`/api/articles/${articleId}/draft`, "POST"],
      [`/api/articles/${articleId}/draft`, "PATCH"],
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/articles/${articleId}/draft`,
      { method: "POST", headers: {} },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `/api/articles/${articleId}/draft`,
      {
        method: "PATCH",
        body: JSON.stringify({ sections: [draftSection] }),
        headers: { "Content-Type": "application/json" },
      },
    );
  });

  it("generates talking points with optional trimmed instructions", async () => {
    const result = {
      section_id: draftSection.id,
      points: ["First point", "Second point", "Third point"],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(result),
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateTalkingPoints(articleId, draftSection.id);
    await generateTalkingPoints(articleId, draftSection.id, {
      instruction: "  Focus on operational costs  ",
    });
    await generateTalkingPoints(articleId, draftSection.id, {
      instruction: "   ",
    });

    const url = `/api/articles/${articleId}/draft/sections/${draftSection.id}/talking-points`;
    expect(fetchMock).toHaveBeenNthCalledWith(1, url, {
      method: "POST",
      headers: {},
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, url, {
      method: "POST",
      body: JSON.stringify({ instruction: "Focus on operational costs" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, url, {
      method: "POST",
      headers: {},
    });
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
