import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { cookiesMock, createMock, getMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  createMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("axios", () => ({
  default: {
    create: createMock,
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === "object" && "isAxiosError" in error),
  },
}));

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000";
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
  createMock.mockReturnValue({
    defaults: { headers: { common: {} } },
    get: getMock,
  });
  getMock.mockResolvedValue({
    data: {
      id: "675bd099-ae1f-4246-b91e-a49b8077f65c",
      name: "writer_01's workspace",
      role: "owner",
      created_at: "2026-09-10T12:00:00Z",
      updated_at: "2026-09-10T12:00:00Z",
    },
  });
});

describe("/api/workspaces/current", () => {
  it("returns the authenticated default workspace", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith("/api/v1/workspaces/current");
  });

  it("requires a session cookie", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });
    expect((await GET()).status).toBe(401);
  });
});
