import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";

const { cookiesMock, createMock, getMock, patchMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  createMock: vi.fn(),
  getMock: vi.fn(),
  patchMock: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("axios", () => ({
  default: {
    create: createMock,
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === "object" && "isAxiosError" in error),
  },
}));

const id = "8d9dd792-78d8-4c9a-84bb-67d84c78b62a";
const client = {
  id,
  workspace_id: "675bd099-ae1f-4246-b91e-a49b8077f65c",
  name: "Northstar Labs",
  website: null,
  industry: null,
  brand_profile: null,
  created_at: "2026-09-10T12:00:00Z",
  updated_at: "2026-09-10T12:00:00Z",
};
const context = { params: Promise.resolve({ clientId: id }) };

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000";
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
  createMock.mockReturnValue({
    defaults: { headers: { common: {} } },
    get: getMock,
    patch: patchMock,
  });
  getMock.mockResolvedValue({ data: client });
  patchMock.mockResolvedValue({
    data: { ...client, industry: "B2B software" },
  });
});

describe("/api/clients/[clientId]", () => {
  it("reads and updates a workspace client", async () => {
    expect((await GET(new Request("http://local"), context)).status).toBe(200);
    const response = await PATCH(
      new Request("http://local", {
        method: "PATCH",
        body: JSON.stringify({ industry: "B2B software" }),
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(patchMock).toHaveBeenCalledWith(`/api/v1/clients/${id}`, {
      industry: "B2B software",
    });
  });

  it("rejects invalid identifiers and empty updates", async () => {
    const invalidContext = { params: Promise.resolve({ clientId: "invalid" }) };
    expect(
      (await GET(new Request("http://local"), invalidContext)).status,
    ).toBe(422);
    expect(
      (
        await PATCH(
          new Request("http://local", { method: "PATCH", body: "{}" }),
          context,
        )
      ).status,
    ).toBe(422);
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("forwards cross-workspace not-found responses", async () => {
    getMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          error: { code: "client_not_found", message: "Client not found" },
        },
      },
    });
    const response = await GET(new Request("http://local"), context);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "client_not_found" },
    });
  });
});
