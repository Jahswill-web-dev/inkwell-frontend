import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const validRequest = () =>
  new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "  Ada Lovelace ",
      email: " ADA@example.com ",
    }),
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.WAITLIST_API_URL;
  delete process.env.WAITLIST_API_KEY;
});

describe("POST /api/waitlist", () => {
  it("returns field errors for invalid details", async () => {
    const response = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ name: "", email: "invalid" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.fieldErrors.name).toBeDefined();
    expect(body.fieldErrors.email).toBeDefined();
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        body: "{bad-json",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when the upstream service is not configured", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(validRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it("forwards normalized data and the server credential", async () => {
    process.env.WAITLIST_API_URL = "https://waitlist.example/join";
    process.env.WAITLIST_API_KEY = "server-secret";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(validRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "You're added to the waitlist",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://waitlist.example/join");
    expect(options?.headers).toEqual({
      Authorization: "Bearer server-secret",
    });
    const body = options?.body as FormData;
    expect(body.get("name")).toBe("Ada Lovelace");
    expect(body.get("email")).toBe("ada@example.com");
  });

  it("returns 502 when the upstream rejects the request", async () => {
    process.env.WAITLIST_API_URL = "https://waitlist.example/join";
    process.env.WAITLIST_API_KEY = "server-secret";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 409 })),
    );

    const response = await POST(validRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it("returns 502 when the upstream cannot be reached", async () => {
    process.env.WAITLIST_API_URL = "https://waitlist.example/join";
    process.env.WAITLIST_API_KEY = "server-secret";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new Error("network unavailable")),
    );

    const response = await POST(validRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });
});
