import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { articleBackendClientMock, getArticleTokenMock, getMock } = vi.hoisted(
  () => ({
    articleBackendClientMock: vi.fn(),
    getArticleTokenMock: vi.fn(),
    getMock: vi.fn(),
  }),
);

vi.mock("@/lib/articles/server", () => ({
  articleBackendClient: articleBackendClientMock,
  articleErrorResponse: (status: number, code: string, message: string) =>
    Response.json({ error: { code, message } }, { status }),
  articleUpstreamError: vi.fn(),
  getArticleToken: getArticleTokenMock,
}));

const articleId = "eb2b0824-1346-4a34-a9ff-387d4d01571a";
const invitationId = "16a0c88f-7b0b-48e3-8f88-ea1f7cc49ec7";

describe("GET /api/articles/[articleId]/invitations/[invitationId]/transcript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getArticleTokenMock.mockResolvedValue("writer-token");
    articleBackendClientMock.mockReturnValue({ get: getMock });
    getMock.mockResolvedValue({ status: 200, data: { id: "transcript-id" } });
  });

  it("forwards the writer token to the protected backend transcript endpoint", async () => {
    const response = await GET(new Request("http://local/api/transcript"), {
      params: Promise.resolve({ articleId, invitationId }),
    });

    expect(response.status).toBe(200);
    expect(articleBackendClientMock).toHaveBeenCalledWith("writer-token");
    expect(getMock).toHaveBeenCalledWith(
      `/api/v1/articles/${articleId}/invitations/${invitationId}/transcript`,
    );
  });

  it("returns 401 without a writer session", async () => {
    getArticleTokenMock.mockResolvedValue(null);

    const response = await GET(new Request("http://local/api/transcript"), {
      params: Promise.resolve({ articleId, invitationId }),
    });

    expect(response.status).toBe(401);
    expect(articleBackendClientMock).not.toHaveBeenCalled();
  });
});
