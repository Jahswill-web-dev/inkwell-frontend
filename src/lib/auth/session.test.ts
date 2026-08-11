import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateAccessToken } from "./session";

const { createMock, getMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: createMock,
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === "object" && "isAxiosError" in error),
  },
}));

const user = {
  id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  email: "writer@example.com",
  username: "writer_01",
  created_at: "2026-08-11T12:00:00Z",
  updated_at: "2026-08-11T12:00:00Z",
};

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000";
  createMock.mockReset().mockReturnValue({ get: getMock });
  getMock.mockReset().mockResolvedValue({ status: 200, data: user });
});

afterEach(() => {
  delete process.env.AUTH_API_URL;
  delete process.env.E2E_AUTH_BYPASS_TOKEN;
  vi.unstubAllEnvs();
});

describe("validateAccessToken", () => {
  it("returns a validated current user", async () => {
    await expect(validateAccessToken("valid-token")).resolves.toEqual({
      status: "authenticated",
      user,
    });
    expect(getMock).toHaveBeenCalledWith("/api/v1/auth/me", {
      headers: { Authorization: "Bearer valid-token" },
    });
  });

  it("treats backend 401 as unauthenticated", async () => {
    getMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });
    await expect(validateAccessToken("expired-token")).resolves.toEqual({
      status: "unauthenticated",
    });
  });

  it.each([
    ["backend outage", { isAxiosError: true, response: { status: 500 } }],
    ["network outage", { isAxiosError: true }],
  ])("fails closed during %s", async (_label, error) => {
    getMock.mockRejectedValue(error);
    await expect(validateAccessToken("token")).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("rejects malformed current-user data", async () => {
    getMock.mockResolvedValue({ status: 200, data: { username: "writer" } });
    await expect(validateAccessToken("token")).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("accepts the exact E2E token only outside production", async () => {
    process.env.E2E_AUTH_BYPASS_TOKEN = "exact-test-token";
    const result = await validateAccessToken("exact-test-token");
    expect(result.status).toBe("authenticated");
    expect(createMock).not.toHaveBeenCalled();

    vi.stubEnv("NODE_ENV", "production");
    await validateAccessToken("exact-test-token");
    expect(createMock).toHaveBeenCalled();
  });
});
