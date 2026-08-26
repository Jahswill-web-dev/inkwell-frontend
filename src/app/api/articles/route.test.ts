import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const { cookiesMock, createMock, getMock, postMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(), createMock: vi.fn(), getMock: vi.fn(), postMock: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("axios", () => ({
  default: { create: createMock, isAxiosError: (error: unknown) => Boolean(error && typeof error === "object" && "isAxiosError" in error) },
}));

const article = { id: "be5579e3-24fd-4272-a35f-f74740c3887e", user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31", notes: "Notes", working_title: "Title", target_audience: ["Writers"], article_goal: "inform_and_inspire", created_at: "2026-08-12T12:00:00Z", updated_at: "2026-08-12T12:00:00Z" };
const input = { notes: "Notes", working_title: "Title", target_audience: ["Writers"], article_goal: "inform_and_inspire" };

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000";
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
  createMock.mockReturnValue({ defaults: { headers: { common: {} } }, get: getMock, post: postMock });
  getMock.mockResolvedValue({ data: { items: [article], total: 1, offset: 0, limit: 20 } });
  postMock.mockResolvedValue({ data: article });
});

describe("/api/articles", () => {
  it("forwards authenticated pagination and validates the response", async () => {
    const response = await GET(new Request("http://local/api/articles?offset=0&limit=20"));
    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith("/api/v1/articles", { params: { offset: 0, limit: 20 } });
    expect(createMock.mock.results[0].value.defaults.headers.common.Authorization).toBe("Bearer token");
  });

  it("validates and creates an intake", async () => {
    const response = await POST(new Request("http://local/api/articles", { method: "POST", body: JSON.stringify(input) }));
    expect(response.status).toBe(201);
    expect(postMock).toHaveBeenCalledWith("/api/v1/articles", input);
  });

  it("rejects invalid pagination and input", async () => {
    expect((await GET(new Request("http://local/api/articles?limit=101"))).status).toBe(422);
    expect((await POST(new Request("http://local/api/articles", { method: "POST", body: "{}" }))).status).toBe(422);
  });

  it("requires a session cookie", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });
    expect((await GET(new Request("http://local/api/articles"))).status).toBe(401);
  });
});
