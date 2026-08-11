import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { createMock, postMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: createMock,
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === "object" && "isAxiosError" in error),
  },
}));

const success = {
  access_token: "signed.jwt.token",
  token_type: "bearer",
  user: {
    id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
    email: "writer@example.com",
    username: "writer_01",
    created_at: "2026-08-11T12:00:00Z",
    updated_at: "2026-08-11T12:00:00Z",
  },
};

function request(
  body: unknown = {
    email: " Writer@Example.com ",
    password: " thoughtful password ",
  },
) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000/";
  createMock.mockReset().mockReturnValue({ post: postMock });
  postMock.mockReset().mockResolvedValue({ status: 200, data: success });
});

afterEach(() => {
  delete process.env.AUTH_API_URL;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/auth/login", () => {
  it("validates before contacting the backend", async () => {
    const response = await POST(request({ email: "bad", password: "" }));
    expect(response.status).toBe(422);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("forwards normalized credentials and keeps the token server-only", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(postMock).toHaveBeenCalledWith("/api/v1/auth/login", {
      email: "writer@example.com",
      password: " thoughtful password ",
    });
    expect(body).toEqual({ user: success.user });
    expect(JSON.stringify(body)).not.toContain(success.access_token);
    expect(response.headers.get("set-cookie")).toContain(
      "inkwell_access_token=signed.jwt.token",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).not.toContain("Max-Age");
  });

  it("uses a secure cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await POST(request());
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it.each([401, 422])("preserves a valid backend %s error", async (status) => {
    const data = {
      error: {
        code: status === 401 ? "invalid_credentials" : "validation_error",
        message: "Safe backend message",
      },
    };
    postMock.mockRejectedValue({
      isAxiosError: true,
      response: { status, data },
    });

    const response = await POST(request());
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual(data);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("preserves a numeric Retry-After header for rate limiting", async () => {
    postMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 429,
        headers: { "retry-after": "742" },
        data: {
          error: {
            code: "too_many_login_attempts",
            message: "Too many login attempts. Please try again later",
          },
        },
      },
    });

    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("742");
  });

  it.each([
    ["network failure", { isAxiosError: true }],
    ["malformed success", null],
  ])("sanitizes %s", async (_label, failure) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    if (failure) postMock.mockRejectedValue(failure);
    else
      postMock.mockResolvedValue({ status: 200, data: { access_token: "" } });

    const response = await POST(request());
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "login_unavailable",
        message: "Sign in is temporarily unavailable",
      },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
