import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";

const { cookiesMock, createMock, getMock, patchMock, deleteMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(), createMock: vi.fn(), getMock: vi.fn(), patchMock: vi.fn(), deleteMock: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("axios", () => ({ default: { create: createMock, isAxiosError: (error: unknown) => Boolean(error && typeof error === "object" && "isAxiosError" in error) } }));

const id = "be5579e3-24fd-4272-a35f-f74740c3887e";
const article = { id, user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31", notes: "Notes", working_title: "Title", target_audience: "Writers", article_goal: "inform_and_inspire", created_at: "2026-08-12T12:00:00Z", updated_at: "2026-08-12T12:00:00Z" };
const context = { params: Promise.resolve({ articleId: id }) };

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000";
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
  createMock.mockReturnValue({ defaults: { headers: { common: {} } }, get: getMock, patch: patchMock, delete: deleteMock });
  getMock.mockResolvedValue({ data: article });
  patchMock.mockResolvedValue({ data: { ...article, working_title: "New title" } });
  deleteMock.mockResolvedValue({ status: 204 });
});

describe("/api/articles/[articleId]", () => {
  it("reads, patches, and deletes an owned article", async () => {
    expect((await GET(new Request("http://local"), context)).status).toBe(200);
    expect((await PATCH(new Request("http://local", { method: "PATCH", body: JSON.stringify({ working_title: "New title" }) }), context)).status).toBe(200);
    expect((await DELETE(new Request("http://local"), context)).status).toBe(204);
    expect(patchMock).toHaveBeenCalledWith(`/api/v1/articles/${id}`, { working_title: "New title" });
  });

  it("rejects an empty patch", async () => {
    const response = await PATCH(new Request("http://local", { method: "PATCH", body: "{}" }), context);
    expect(response.status).toBe(422);
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("forwards a documented not-found response", async () => {
    getMock.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: { error: { code: "article_not_found", message: "Article not found" } } } });
    const response = await GET(new Request("http://local"), context);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "article_not_found" } });
  });
});
