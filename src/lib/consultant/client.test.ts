import { afterEach, expect, it, vi } from "vitest";
import { consultantRequest } from "./client";

afterEach(() => vi.unstubAllGlobals());

it("refreshes and retries a consultant save after access expiry", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ status: 401, ok: false })
    .mockResolvedValueOnce({ status: 200, ok: true })
    .mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ saved: true }),
    });
  vi.stubGlobal("fetch", fetchMock);

  await expect(
    consultantRequest("articles/article-id/draft", "PUT", { sections: [] }),
  ).resolves.toEqual({ saved: true });
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "/api/consultant/articles/article-id/draft",
    "/api/auth/refresh",
    "/api/consultant/articles/article-id/draft",
  ]);
});

it("shows a useful error when the server responds with text", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 502,
      ok: false,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    }),
  );
  await expect(
    consultantRequest("articles/article-id/draft", "PUT"),
  ).rejects.toThrow("We couldn't complete that request. Please try again.");
});
