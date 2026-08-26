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
      Boolean(
        error &&
        typeof error === "object" &&
        "isAxiosError" in error &&
        error.isAxiosError,
      ),
  },
}));

const backendSuccess = {
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

function registrationRequest(
  body: unknown = {
    email: " Writer@Example.com ",
    username: "writer_01",
    password: "thoughtful-password",
  },
) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000/";
  createMock.mockReset();
  postMock.mockReset();
  createMock.mockReturnValue({ post: postMock });
  postMock.mockResolvedValue({ data: backendSuccess, status: 201 });
});

afterEach(() => {
  delete process.env.AUTH_API_URL;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/auth/register", () => {
  it("validates requests before creating an Axios client", async () => {
    const response = await POST(
      registrationRequest({
        email: "invalid",
        username: "Writer 01",
        password: "short",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ loc: ["body", "email"] }),
        expect.objectContaining({ loc: ["body", "username"] }),
        expect.objectContaining({ loc: ["body", "password"] }),
      ]),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: "{bad-json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_json" },
    });
  });

  it("returns 500 when the authentication service is not configured", async () => {
    delete process.env.AUTH_API_URL;
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(registrationRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "auth_not_configured" },
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("forwards normalized data and stores the token in a session cookie", async () => {
    const response = await POST(registrationRequest());
    const body = await response.json();

    expect(createMock).toHaveBeenCalledWith({
      baseURL: "http://127.0.0.1:8000",
      timeout: 10_000,
      headers: { "Content-Type": "application/json" },
    });
    expect(postMock).toHaveBeenCalledWith("/api/v1/auth/register", {
      email: "writer@example.com",
      username: "writer_01",
      password: "thoughtful-password",
    });
    expect(response.status).toBe(201);
    expect(body).toEqual({ user: backendSuccess.user });
    expect(JSON.stringify(body)).not.toContain("signed.jwt.token");

    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("inkwell_access_token=signed.jwt.token");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).not.toContain("Max-Age");
    expect(cookie).not.toContain("Expires");
  });

  it("marks the authentication cookie secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(registrationRequest());

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it.each([
    [
      409,
      {
        error: {
          code: "username_taken",
          message: "This username is already taken",
        },
      },
    ],
    [
      422,
      {
        error: {
          code: "validation_error",
          message: "Request validation failed",
          details: [
            {
              type: "string_too_short",
              loc: ["body", "password"],
              msg: "String should have at least 8 characters",
            },
          ],
        },
      },
    ],
  ])("preserves a valid backend %s response", async (status, data) => {
    postMock.mockRejectedValue({
      isAxiosError: true,
      response: { status, data },
    });

    const response = await POST(registrationRequest());

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual(data);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["network failure", { isAxiosError: true }],
    [
      "unexpected upstream response",
      {
        isAxiosError: true,
        response: {
          status: 500,
          data: {
            error: {
              code: "internal_server_error",
              message: "Internal details",
            },
          },
        },
      },
    ],
  ])("sanitizes %s", async (_name, error) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    postMock.mockRejectedValue(error);

    const response = await POST(registrationRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: {
        code: "registration_unavailable",
        message: "Registration is temporarily unavailable",
      },
    });
    expect(JSON.stringify(body)).not.toContain("Internal details");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects malformed successful backend data without setting a cookie", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    postMock.mockResolvedValue({
      status: 201,
      data: { ...backendSuccess, access_token: "" },
    });

    const response = await POST(registrationRequest());

    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
