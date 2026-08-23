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
const path = `/api/v1/articles/${articleId}/draft/sections/${sectionId}/talking-points`;
const result = {
  section_id: sectionId,
  points: ["First point", "Second point", "Third point"],
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

describe("talking-points proxy", () => {
  it("sends a bodyless request when no instruction is provided", async () => {
    const response = await POST(
      new Request("http://local", { method: "POST" }),
      context,
    );

    expect(response.status).toBe(200);
    expect(postMock).toHaveBeenCalledWith(path);
  });

  it("trims and forwards an optional instruction", async () => {
    const response = await POST(
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({ instruction: "  Focus on costs  " }),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(postMock).toHaveBeenCalledWith(path, {
      instruction: "Focus on costs",
    });
  });

  it("validates authentication, IDs, and instructions", async () => {
    cookiesMock.mockResolvedValueOnce({ get: () => undefined });
    expect(
      (await POST(new Request("http://local", { method: "POST" }), context))
        .status,
    ).toBe(401);

    expect(
      (
        await POST(
          new Request("http://local", {
            method: "POST",
            body: JSON.stringify({ instruction: "x".repeat(1001) }),
          }),
          context,
        )
      ).status,
    ).toBe(422);

    expect(
      (
        await POST(new Request("http://local", { method: "POST" }), {
          params: Promise.resolve({ articleId, sectionId: "invalid" }),
        })
      ).status,
    ).toBe(422);
  });

  it("rejects mismatched or malformed successful responses", async () => {
    postMock.mockResolvedValueOnce({
      data: { ...result, section_id: articleId },
    });
    expect(
      (await POST(new Request("http://local", { method: "POST" }), context))
        .status,
    ).toBe(502);
  });

  it("preserves documented upstream errors", async () => {
    postMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 503,
        data: {
          error: {
            code: "talking_points_generation_unavailable",
            message: "Talking-point generation is unavailable.",
          },
        },
      },
    });
    const response = await POST(
      new Request("http://local", { method: "POST" }),
      context,
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "talking_points_generation_unavailable" },
    });
  });
});
