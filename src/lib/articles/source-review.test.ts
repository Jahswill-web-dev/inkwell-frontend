import { describe, expect, it } from "vitest";
import {
  completeClientInterview,
  createClientInterviewSession,
  startClientInterview,
  submitClientInterviewAnswer,
} from "./client-interview-session";
import {
  approveSourceReview,
  createSourceReview,
  updateSourceReviewItem,
} from "./source-review";

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";

function answeredSession(token: string, answers: string[]) {
  let session = startClientInterview(createClientInterviewSession(token));
  answers.forEach((answer) => {
    session = submitClientInterviewAnswer(session, answer);
  });
  return completeClientInterview(session);
}

describe("source review", () => {
  it("creates attributed material and highlights gaps and conflicts", () => {
    const client = answeredSession("client-token-value-that-is-long-enough", [
      "The client believes the main takeaway should focus on faster publishing and reliable expert input.",
    ]);
    const writer = answeredSession("writer-token-value-that-is-long-enough", [
      "The writer believes the main takeaway should focus on stronger evidence and distinctive expertise.",
    ]);
    const review = createSourceReview(articleId, [
      { type: "client", label: "Client · Avery", session: client },
      { type: "writer", label: "Writer · Nina", session: writer },
    ]);

    expect(
      review.items.some((item) => item.sourceLabel === "Client · Avery"),
    ).toBe(true);
    expect(
      review.items.some((item) => item.sourceLabel === "Writer · Nina"),
    ).toBe(true);
    expect(review.items.some((item) => item.category === "conflict")).toBe(
      true,
    );
    expect(review.items.some((item) => item.category === "missing")).toBe(true);
  });

  it("invalidates approval after an item is edited or excluded", () => {
    const session = answeredSession("writer-token-value-that-is-long-enough", [
      "A useful and specific writer perspective based on direct experience.",
    ]);
    const initial = createSourceReview(articleId, [
      { type: "writer", label: "Writer · Nina", session },
    ]);
    const approved = approveSourceReview(initial);
    const updated = updateSourceReviewItem(approved, approved.items[0].id, {
      content: "Edited summary",
      included: false,
    });

    expect(updated.status).toBe("draft");
    expect(updated.approvedAt).toBeNull();
    expect(updated.items[0]).toMatchObject({
      content: "Edited summary",
      included: false,
    });
  });
});
