import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { cookiesMock, createMock, postMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  createMock: vi.fn(),
  postMock: vi.fn(),
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
const sectionId = "20000000-0000-4000-8000-000000000000";
const context = { params: Promise.resolve({ articleId, sectionId }) };
const path = `/api/v1/articles/${articleId}/draft/sections/${sectionId}/questions`;
const result = {
  section_id: sectionId,
  questions: ["First question?", "Second question?", "Third question?"],
};

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000";
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
  createMock.mockReturnValue({
    defaults: { headers: { common: {} } },
    post: postMock,
  });
  postMock.mockResolvedValue({ data: result });
});

describe("guided-questions proxy", () => {
  it("requests and returns two to four questions", async () => {
    const response = await POST(
      new Request("http://local", { method: "POST" }),
      context,
    );

    expect(response.status).toBe(200);
    expect(postMock).toHaveBeenCalledWith(path);
    expect(await response.json()).toEqual(result);
  });

  it("validates authentication and route IDs", async () => {
    cookiesMock.mockResolvedValueOnce({ get: () => undefined });
    expect(
      (await POST(new Request("http://local", { method: "POST" }), context))
        .status,
    ).toBe(401);

    expect(
      (
        await POST(new Request("http://local", { method: "POST" }), {
          params: Promise.resolve({ articleId, sectionId: "invalid" }),
        })
      ).status,
    ).toBe(422);
  });

  it("rejects malformed counts and mismatched sections", async () => {
    postMock.mockResolvedValueOnce({
      data: { ...result, questions: ["Only one?"] },
    });
    expect(
      (await POST(new Request("http://local", { method: "POST" }), context))
        .status,
    ).toBe(502);

    postMock.mockResolvedValueOnce({
      data: { ...result, section_id: articleId },
    });
    expect(
      (await POST(new Request("http://local", { method: "POST" }), context))
        .status,
    ).toBe(502);
  });
});
