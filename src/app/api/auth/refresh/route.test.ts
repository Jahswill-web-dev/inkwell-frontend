import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { createMock, postMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("@/lib/auth/backend", () => ({
  createAuthApiClient: createMock,
}));

function request(cookie?: string, origin?: string) {
  return new NextRequest("http://localhost/api/auth/refresh", {
    method: "POST",
    headers: {
      ...(cookie ? { cookie: `inkwell_refresh_token=${cookie}` } : {}),
      ...(origin ? { origin } : {}),
    },
  });
}

beforeEach(() => {
  createMock.mockReset().mockReturnValue({ post: postMock });
  postMock.mockReset().mockResolvedValue({
    data: {
      access_token: "new.access.token",
      refresh_token: "n".repeat(64),
      refresh_expires_at: "2026-11-26T12:00:00Z",
    },
  });
});

describe("POST /api/auth/refresh", () => {
  it("rotates both cookies without exposing tokens in the response body", async () => {
    const response = await POST(request("r".repeat(64)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ refreshed: true });
    expect(postMock).toHaveBeenCalledWith("/api/v1/auth/refresh", {
      refresh_token: "r".repeat(64),
    });
    expect(response.headers.get("set-cookie")).toContain(
      "inkwell_access_token=new.access.token",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "inkwell_refresh_token=",
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age");
  });

  it("rejects missing credentials and foreign origins", async () => {
    expect((await POST(request())).status).toBe(401);
    expect(
      (await POST(request("r".repeat(64), "https://other.example"))).status,
    ).toBe(403);
    expect(postMock).not.toHaveBeenCalled();
  });

  it("clears both cookies when the long session has expired", async () => {
    postMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });
    const response = await POST(request("r".repeat(64)));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain(
      "inkwell_access_token=",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "inkwell_refresh_token=",
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
