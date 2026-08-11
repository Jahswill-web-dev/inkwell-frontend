import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("expires the HTTP-only authentication cookie", async () => {
    const response = await POST();
    const cookie = response.headers.get("set-cookie");

    expect(response.status).toBe(204);
    expect(cookie).toContain("inkwell_access_token=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });
});
