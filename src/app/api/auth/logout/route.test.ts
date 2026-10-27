import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));
vi.mock("@/lib/auth/backend", () => ({
  createAuthApiClient: () => ({ post: postMock }),
}));

describe("POST /api/auth/logout", () => {
  it("expires the HTTP-only authentication cookie", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/auth/logout"),
    );
    const cookie = response.headers.get("set-cookie");

    expect(response.status).toBe(204);
    expect(cookie).toContain("inkwell_access_token=");
    expect(cookie).toContain("inkwell_refresh_token=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });

  it("revokes the persistent session before clearing its cookie", async () => {
    postMock.mockResolvedValue({ status: 204 });
    const response = await POST(
      new NextRequest("http://localhost/api/auth/logout", {
        headers: { cookie: `inkwell_refresh_token=${"r".repeat(64)}` },
      }),
    );
    expect(response.status).toBe(204);
    expect(postMock).toHaveBeenCalledWith("/api/v1/auth/logout", {
      refresh_token: "r".repeat(64),
    });
  });
});
