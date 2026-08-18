import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "./route";

const { cookiesMock, createMock, getMock, postMock, patchMock, deleteMock } =
  vi.hoisted(() => ({
    cookiesMock: vi.fn(),
    createMock: vi.fn(),
    getMock: vi.fn(),
    postMock: vi.fn(),
    patchMock: vi.fn(),
    deleteMock: vi.fn(),
  }));
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

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000";
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
  createMock.mockReturnValue({
    defaults: { headers: { common: {} } },
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  });
  getMock.mockResolvedValue({ data: outline });
  postMock.mockResolvedValue({ data: outline });
  patchMock.mockResolvedValue({ data: outline });
  deleteMock.mockResolvedValue({ status: 204 });
});

describe("/api/articles/[articleId]/outline", () => {
  it("forwards GET, POST, PATCH, and DELETE", async () => {
    expect((await GET(new Request("http://local"), context)).status).toBe(200);
    expect(
      (await POST(new Request("http://local", { method: "POST" }), context))
        .status,
    ).toBe(200);
    expect(
      (
        await PATCH(
          new Request("http://local", {
            method: "PATCH",
            body: JSON.stringify({ sections }),
          }),
          context,
        )
      ).status,
    ).toBe(200);
    expect(
      (await DELETE(new Request("http://local", { method: "DELETE" }), context))
        .status,
    ).toBe(204);
    expect(patchMock).toHaveBeenCalledWith(
      `/api/v1/articles/${articleId}/outline`,
      { sections },
    );
  });

  it("rejects invalid patches and unauthenticated requests", async () => {
    expect(
      (
        await PATCH(
          new Request("http://local", {
            method: "PATCH",
            body: JSON.stringify({ sections: sections.slice(0, 2) }),
          }),
          context,
        )
      ).status,
    ).toBe(422);
    cookiesMock.mockResolvedValueOnce({ get: () => undefined });
    expect((await GET(new Request("http://local"), context)).status).toBe(401);
  });

  it.each([
    [422, "outline_generation_blocked"],
    [502, "outline_generation_failed"],
    [503, "outline_generation_unavailable"],
    [504, "outline_generation_timeout"],
  ])("preserves status %i and code %s", async (status, code) => {
    postMock.mockRejectedValue({
      isAxiosError: true,
      response: { status, data: { error: { code, message: "Failed" } } },
    });
    const response = await POST(
      new Request("http://local", { method: "POST" }),
      context,
    );
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code } });
  });
});
