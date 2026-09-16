import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

describe("authentication proxy", () => {
  it("redirects missing sessions and preserves the requested path", () => {
    const response = proxy(
      new NextRequest("http://localhost/articles/new?mode=notes"),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Farticles%2Fnew%3Fmode%3Dnotes",
    );
  });

  it("allows requests containing an authentication cookie", () => {
    const request = new NextRequest("http://localhost/dashboard", {
      headers: { cookie: "inkwell_access_token=optimistic-token" },
    });
    const response = proxy(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps guest interview links outside the authentication matcher", () => {
    expect(config.matcher).not.toContain("/interview/:path*");
  });
});
