import { describe, expect, it } from "vitest";
import {
  clientInterviewProgress,
  clientInterviewSessionSchema,
  completeClientInterview,
  createClientInterviewSession,
  currentInterviewQuestion,
  pauseClientInterview,
  startClientInterview,
  submitClientInterviewAnswer,
} from "./client-interview-session";

const token = "a".repeat(48);

describe("client interview session", () => {
  it("starts at the welcome and persists a paused draft", () => {
    const initial = createClientInterviewSession(token);
    expect(initial.state).toBe("welcome");
    expect(currentInterviewQuestion(initial)?.id).toBe("key-message");

    const active = startClientInterview(initial);
    const paused = pauseClientInterview(active, "An unfinished thought");
    expect(paused).toMatchObject({
      state: "paused",
      draftAnswer: "An unfinished thought",
    });
  });

  it("asks a targeted follow-up after a thin answer", () => {
    const active = startClientInterview(createClientInterviewSession(token));
    const next = submitClientInterviewAnswer(active, "Customers save time.");
    expect(next.answers).toHaveLength(1);
    expect(currentInterviewQuestion(next)).toMatchObject({
      kind: "follow_up",
    });
    expect(currentInterviewQuestion(next)?.text).toContain("more specific");
  });

  it("asks for a final contribution before completing normal coverage", () => {
    const detailed = Array.from(
      { length: 40 },
      (_, index) => "detail" + index,
    ).join(" ");
    let session = startClientInterview(createClientInterviewSession(token));
    session = submitClientInterviewAnswer(session, detailed);
    session = submitClientInterviewAnswer(session, detailed);
    session = submitClientInterviewAnswer(session, detailed);
    expect(session.state).toBe("active");
    expect(currentInterviewQuestion(session)?.text).toBe(
      "Is there anything else you'd like to add to the article?",
    );
    session = submitClientInterviewAnswer(
      session,
      "A practical example to include.",
    );
    expect(session.state).toBe("completed");
    expect(session.answers.at(-1)?.answer).toBe(
      "A practical example to include.",
    );
    expect(clientInterviewProgress(session)).toBe(100);
  });

  it("accepts no without adding an article source", () => {
    const detailed = Array.from(
      { length: 40 },
      (_, index) => `detail${index}`,
    ).join(" ");
    let session = startClientInterview(createClientInterviewSession(token));
    for (let index = 0; index < 3; index++) {
      session = submitClientInterviewAnswer(session, detailed);
    }
    const complete = submitClientInterviewAnswer(session, "No, thank you.");
    expect(complete.state).toBe("completed");
    expect(complete.finalDetailAdded).toBe(true);
    expect(complete.answers).toHaveLength(3);
  });

  it("asks the final question after the full question list when coverage stays thin", () => {
    const answer = Array.from(
      { length: 20 },
      (_, index) => `word${index}`,
    ).join(" ");
    let session = startClientInterview(createClientInterviewSession(token));
    for (let index = 0; index < 6; index++) {
      session = submitClientInterviewAnswer(session, answer);
    }
    expect(session.state).toBe("active");
    expect(currentInterviewQuestion(session)?.kind).toBe("final_detail");
    expect(session.answers).toHaveLength(6);
  });

  it("ends immediately when the participant chooses to finish early", () => {
    const active = startClientInterview(createClientInterviewSession(token));
    const complete = completeClientInterview(active);
    expect(complete.state).toBe("completed");
    expect(
      complete.questions.some((question) => question.kind === "final_detail"),
    ).toBe(false);
  });

  it("accepts UTC offsets returned by the backend", () => {
    const session = createClientInterviewSession(token);
    expect(
      clientInterviewSessionSchema.parse({
        ...session,
        updatedAt: "2026-09-11T16:01:12.571358+00:00",
      }).updatedAt,
    ).toBe("2026-09-11T16:01:12.571358+00:00");
  });
});
