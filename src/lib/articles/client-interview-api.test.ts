import { afterEach, describe, expect, it, vi } from "vitest";
import { getInterviewTranscript } from "./client-interview-api";

afterEach(() => vi.unstubAllGlobals());

describe("getInterviewTranscript", () => {
  it("accepts the complete backend response and requests the writer endpoint", async () => {
    const articleId = "eb2b0824-1346-4a34-a9ff-387d4d01571a";
    const invitationId = "b8cfc60a-0747-43ee-b00b-b80a8d2c7558";
    const payload = {
      id: "9c6d64ea-8836-458b-b9cd-04ea8b94050b",
      invitation_id: invitationId,
      turns: [
        { item_id: "saved-1", speaker: "participant", text: "Saved answer" },
      ],
      insight_status: "ready",
      insights: {
        summary: "Summary",
        key_insights: [],
        examples_and_evidence: [],
        claims_to_verify: [],
        open_questions: [],
      },
      model_id: "test-model",
      generation_error: null,
      created_at: "2026-10-05T12:00:00Z",
      updated_at: "2026-10-05T12:05:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(payload));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getInterviewTranscript(articleId, invitationId),
    ).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/articles/${articleId}/invitations/${invitationId}/transcript`,
      expect.objectContaining({ headers: {} }),
    );
  });
});
