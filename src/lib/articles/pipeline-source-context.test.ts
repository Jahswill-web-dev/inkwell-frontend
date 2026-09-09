import { beforeEach, describe, expect, it } from "vitest";
import {
  completeClientInterview,
  startClientInterview,
  submitClientInterviewAnswer,
} from "./client-interview-session";
import { loadPipelineSourceContext } from "./pipeline-source-context";
import { approveSourceReview, createSourceReview } from "./source-review";
import { saveSourceReview } from "./source-review-storage";
import {
  createWriterInterviewMaterial,
  saveWriterInterviewMaterial,
} from "./writer-interview-storage";

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("pipeline source context", () => {
  it("tracks approved provenance and downstream staleness", () => {
    const material = createWriterInterviewMaterial(articleId);
    const session = completeClientInterview(
      submitClientInterviewAnswer(
        startClientInterview(material.session),
        "A useful writer perspective based on direct agency experience.",
      ),
    );
    saveWriterInterviewMaterial(material, session);
    const review = approveSourceReview(
      createSourceReview(
        articleId,
        [{ type: "writer", label: "Writer", session }],
        new Date("2026-08-20T10:04:00Z"),
      ),
      new Date("2026-08-20T10:05:00Z"),
    );
    saveSourceReview(review);

    expect(
      loadPipelineSourceContext(articleId, "2026-08-20T10:00:00Z"),
    ).toMatchObject({ state: "content_stale" });
    expect(
      loadPipelineSourceContext(articleId, "2026-08-20T10:06:00Z"),
    ).toMatchObject({
      state: "approved",
      approvedCount: review.items.filter((item) => item.included).length,
      writerCount: review.items.filter(
        (item) => item.included && item.sourceType === "writer",
      ).length,
    });
  });

  it("requires another review when interview material changes", () => {
    const material = createWriterInterviewMaterial(articleId);
    const session = completeClientInterview(
      submitClientInterviewAnswer(
        startClientInterview(material.session),
        "A distinct and useful perspective from the writer's experience.",
      ),
    );
    saveWriterInterviewMaterial(material, session);
    saveSourceReview(
      approveSourceReview(
        createSourceReview(articleId, [
          { type: "writer", label: "Writer", session },
        ]),
      ),
    );
    saveWriterInterviewMaterial(material, {
      ...session,
      updatedAt: new Date(Date.now() + 60_000).toISOString(),
    });

    expect(loadPipelineSourceContext(articleId)).toMatchObject({
      state: "source_changed",
    });
  });
});
