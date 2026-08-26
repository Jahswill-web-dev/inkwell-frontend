import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, POST } from "./route";

const { cookiesMock, createMock, getMock, postMock, patchMock } = vi.hoisted(
  () => ({
    cookiesMock: vi.fn(),
    createMock: vi.fn(),
    getMock: vi.fn(),
    postMock: vi.fn(),
    patchMock: vi.fn(),
  }),
);
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("axios", () => ({
  default: {
    create: createMock,
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === "object" && "isAxiosError" in error),
  },
}));

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
const context = { params: Promise.resolve({ articleId }) };
const brief = {
  id: "ccbfce42-98bf-4f44-b4cf-206cc3661f11",
  article_id: articleId,
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

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000";
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
  createMock.mockReturnValue({
    defaults: { headers: { common: {} } },
    get: getMock,
    post: postMock,
    patch: patchMock,
  });
  getMock.mockResolvedValue({ data: brief });
  postMock.mockResolvedValue({ data: brief });
  patchMock.mockResolvedValue({ data: brief });
});

describe("/api/articles/[articleId]/brief", () => {
  it("retrieves and generates a brief without a request body", async () => {
    expect((await GET(new Request("http://local"), context)).status).toBe(200);
    expect(
      (await POST(new Request("http://local", { method: "POST" }), context))
        .status,
    ).toBe(200);
    expect(getMock).toHaveBeenCalledWith(`/api/v1/articles/${articleId}/brief`);
    expect(postMock).toHaveBeenCalledWith(
      `/api/v1/articles/${articleId}/brief`,
      undefined,
      { timeout: 120_000 },
    );
  });

  it("validates and forwards partial brief updates", async () => {
    const body = { seo: { meta_description: "Updated description" } };
    const response = await PATCH(
      new Request("http://local", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(patchMock).toHaveBeenCalledWith(
      `/api/v1/articles/${articleId}/brief`,
      body,
    );
    const invalid = await PATCH(
      new Request("http://local", { method: "PATCH", body: "{}" }),
      context,
    );
    expect(invalid.status).toBe(422);
  });

  it.each([
    [422, "brief_generation_blocked"],
    [502, "brief_generation_failed"],
    [503, "brief_generation_unavailable"],
    [504, "brief_generation_timeout"],
  ])("preserves status %i and error code %s", async (status, code) => {
    postMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        status,
        data: { error: { code, message: "Generation failed" } },
      },
    });
    const response = await POST(
      new Request("http://local", { method: "POST" }),
      context,
    );
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code } });
  });

  it("requires authentication and validates the article id", async () => {
    cookiesMock.mockResolvedValueOnce({ get: () => undefined });
    expect((await GET(new Request("http://local"), context)).status).toBe(401);
    const invalid = { params: Promise.resolve({ articleId: "invalid" }) };
    expect((await GET(new Request("http://local"), invalid)).status).toBe(422);
  });
});
