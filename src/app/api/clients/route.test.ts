import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const { cookiesMock, createMock, getMock, postMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  createMock: vi.fn(),
  getMock: vi.fn(),
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

const client = {
  id: "8d9dd792-78d8-4c9a-84bb-67d84c78b62a",
  workspace_id: "675bd099-ae1f-4246-b91e-a49b8077f65c",
  name: "Northstar Labs",
  website: null,
  industry: null,
  brand_profile: null,
  created_at: "2026-09-10T12:00:00Z",
  updated_at: "2026-09-10T12:00:00Z",
};

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000";
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
  createMock.mockReturnValue({
    defaults: { headers: { common: {} } },
    get: getMock,
    post: postMock,
  });
  getMock.mockResolvedValue({
    data: { items: [client], total: 1, offset: 0, limit: 100 },
  });
  postMock.mockResolvedValue({ data: client });
});

describe("/api/clients", () => {
  it("lists authenticated workspace clients", async () => {
    const response = await GET(
      new Request("http://local/api/clients?offset=0&limit=100"),
    );
    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith("/api/v1/clients", {
      params: { offset: "0", limit: "100" },
    });
  });

  it("validates and creates a client", async () => {
    const response = await POST(
      new Request("http://local/api/clients", {
        method: "POST",
        body: JSON.stringify({ name: " Northstar Labs " }),
      }),
    );
    expect(response.status).toBe(201);
    expect(postMock).toHaveBeenCalledWith("/api/v1/clients", {
      name: "Northstar Labs",
    });
  });

  it("rejects invalid input and missing authentication", async () => {
    expect(
      (
        await POST(
          new Request("http://local/api/clients", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(422);
    cookiesMock.mockResolvedValue({ get: () => undefined });
    expect(
      (await GET(new Request("http://local/api/clients"))).status,
    ).toBe(401);
  });
});
