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
const section = {
  id: "20000000-0000-4000-8000-000000000000",
  outline_section_id: "10000000-0000-4000-8000-000000000000",
  title: "Introduction",
  goal: "Introduce the problem",
  checklist: [],
  editor_state: '{"root":{"children":[]}}',
};
const draft = {
  id: "30000000-0000-4000-8000-000000000000",
  article_id: articleId,
  sections: [section],
  created_at: "2026-08-18T12:00:00Z",
  updated_at: "2026-08-18T12:00:00Z",
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
  getMock.mockResolvedValue({ data: draft });
  postMock.mockResolvedValue({ data: draft });
  patchMock.mockResolvedValue({ data: draft });
});

describe("/api/articles/[articleId]/draft", () => {
  it("proxies authenticated get and create requests", async () => {
    expect((await GET(new Request("http://local"), context)).status).toBe(200);
    expect((await POST(new Request("http://local"), context)).status).toBe(200);
    expect(getMock).toHaveBeenCalledWith(`/api/v1/articles/${articleId}/draft`);
    expect(postMock).toHaveBeenCalledWith(
      `/api/v1/articles/${articleId}/draft`,
    );
  });

  it("validates and proxies complete draft patches", async () => {
    const response = await PATCH(
      new Request("http://local", {
        method: "PATCH",
        body: JSON.stringify({ sections: [section] }),
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(patchMock).toHaveBeenCalledWith(
      `/api/v1/articles/${articleId}/draft`,
      { sections: [section] },
    );
  });

  it("rejects unauthenticated and malformed requests", async () => {
    cookiesMock.mockResolvedValueOnce({ get: () => undefined });
    expect((await GET(new Request("http://local"), context)).status).toBe(401);
    expect(
      (
        await PATCH(
          new Request("http://local", { method: "PATCH", body: "{}" }),
          context,
        )
      ).status,
    ).toBe(422);
  });

  it("rejects invalid article IDs before contacting the backend", async () => {
    const invalidContext = {
      params: Promise.resolve({ articleId: "not-a-uuid" }),
    };
    const response = await GET(new Request("http://local"), invalidContext);

    expect(response.status).toBe(422);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("preserves documented backend errors", async () => {
    getMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          error: {
            code: "draft_not_found",
            message: "Draft not found.",
          },
        },
      },
    });

    const response = await GET(new Request("http://local"), context);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "draft_not_found", message: "Draft not found." },
    });
  });

  it("rejects malformed successful backend responses", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "not-a-draft" } });

    const response = await GET(new Request("http://local"), context);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: {
        code: "articles_unavailable",
        message: "Articles are temporarily unavailable.",
      },
    });
  });
});
